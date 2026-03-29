# CI/CD con GitHub Actions → Azure App Service

Guía completa para entender, diseñar e implementar el pipeline de integración y despliegue continuo de Cohabit Finance.

---

## Tabla de contenidos

1. [¿Qué es CI/CD y por qué importa?](#1-qué-es-cicd-y-por-qué-importa)
2. [Cómo funciona GitHub Actions](#2-cómo-funciona-github-actions)
3. [Anatomía de un workflow](#3-anatomía-de-un-workflow)
4. [El flujo de trabajo de este proyecto](#4-el-flujo-de-trabajo-de-este-proyecto)
5. [Autenticación GitHub → Azure](#5-autenticación-github--azure)
6. [Secretos en GitHub Actions](#6-secretos-en-github-actions)
7. [Los dos jobs: ci y deploy](#7-los-dos-jobs-ci-y-deploy)
8. [Branch protection rules](#8-branch-protection-rules)
9. [Implementación paso a paso](#9-implementación-paso-a-paso)
10. [Decisiones de diseño](#10-decisiones-de-diseño)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. ¿Qué es CI/CD y por qué importa?

### La situación sin CI/CD

```
1. Escribes código en tu laptop
2. git push
3. Abres la terminal
4. Activas el venv
5. Corres ./deploy.sh
6. Esperas 3 minutos
7. Verificas manualmente que todo funciona
8. Repites en cada cambio
```

Esto funciona cuando hay una sola persona y se deploya esporádicamente. Pero tiene problemas:

- **Olvidable**: Puedes hacer push y olvidarte de deployar.
- **Inconsistente**: El deploy desde tu laptop puede diferir del de otra máquina.
- **Lento**: Requiere atención manual en cada cambio.
- **Sin validación**: Nada verifica que el código funciona *antes* de llegar a producción.

### La situación con CI/CD

```
1. Escribes código
2. git push + abres un Pull Request
3. GitHub automáticamente verifica que el código compila
4. Apruebas y mergeas el PR
5. GitHub automáticamente despliega a Azure
6. Recibes un check verde (o email de error si algo salió mal)
```

### Definición formal

| Sigla | Nombre completo | Qué hace |
|---|---|---|
| **CI** | Continuous Integration | Verifica automáticamente que el código nuevo no rompe el proyecto. Corre en cada PR. |
| **CD** | Continuous Deployment | Despliega automáticamente el código que pasó CI. Corre al mergear. |

**CI** es el "guardia": no deja entrar código roto.
**CD** es el "cartero": lleva el código bueno a producción sin que tengas que hacer nada.

---

## 2. Cómo funciona GitHub Actions

GitHub Actions es el motor de CI/CD nativo de GitHub. Incluido en todas las cuentas personales.

### ¿Qué es un "runner"?

Cuando GitHub Actions ejecuta tu workflow, levanta una **máquina virtual temporal** (llamada *runner*) en los servidores de GitHub:

```
Tu repo en GitHub
      │
      │  Detecta un evento (push, PR abierto, etc.)
      ▼
GitHub levanta una VM Ubuntu limpia
      │
      │  Clona tu repositorio dentro de la VM
      │  Ejecuta los steps uno por uno
      │  Muestra logs en tiempo real en la UI
      ▼
VM se destruye al terminar
```

La VM es efímera: se crea, hace su trabajo, y desaparece. No persiste archivos entre runs.

### Costos para cuentas personales

- **Repos públicos**: gratuito ilimitado.
- **Repos privados**: 2,000 minutos/mes gratis.

Cada deploy de este proyecto toma ~2-3 minutos → más de 600 deploys/mes gratis.

### ¿Dónde viven los archivos de configuración?

En `.github/workflows/` en la raíz del repo. Cada `.yml` es un workflow independiente:

```
.github/
└── workflows/
    └── azure-deploy.yml     ← nuestro workflow
```

GitHub lo detecta automáticamente. Sin registro manual.

---

## 3. Anatomía de un workflow

```yaml
name: Nombre del workflow          # Aparece en la UI de GitHub

on:                                # CUÁNDO se dispara
  pull_request:
    branches: [develop]
  push:
    branches: [develop]

jobs:                              # QUÉ hace
  nombre-del-job:
    runs-on: ubuntu-latest         # En qué máquina corre

    steps:
      - name: Descripción
        uses: action/nombre@v4     # Action de la comunidad

      - name: Otro step
        run: echo "comando bash"   # O comando bash directo
```

### `uses` vs `run`

- **`uses`**: Llama una *Action* publicada en GitHub Marketplace (funciones reutilizables). Ej: `actions/checkout@v4` clona el repo.
- **`run`**: Ejecuta bash directamente, como en tu terminal.

### `working-directory`

Cambia el directorio de trabajo para ese step:

```yaml
- run: npm run build
  working-directory: frontend
# Equivale a: cd frontend && npm run build
```

### Expresiones `${{ }}`

Sintaxis para acceder a valores dinámicos dentro del workflow:

```yaml
- run: echo "App: ${{ secrets.AZURE_WEBAPP_NAME }}"
```

| Expresión | Qué contiene |
|---|---|
| `secrets.NOMBRE` | Secretos encriptados del repo |
| `github.sha` | Hash del commit actual |
| `github.ref_name` | Nombre de la rama actual |
| `github.event_name` | Tipo de evento (`push`, `pull_request`, etc.) |

---

## 4. El flujo de trabajo de este proyecto

```
feature/nueva-pantalla
      │
      │  git push + Pull Request → develop
      ▼
┌─────────────────────────────────────┐
│  Job: Build Check  (on PR)          │
│                                     │
│  1. npm ci + npm run build          │  ← ¿compila React?
│  2. pip install + py_compile        │  ← ¿sintaxis Python OK?
│                                     │
│  ✅ verde → PR listo para merge     │
│  ❌ rojo  → PR bloqueado            │
└─────────────────────────────────────┘
      │
      │  Se aprueba y mergea el PR
      ▼
┌─────────────────────────────────────┐
│  Job: Deploy  (on push, needs ci)   │
│                                     │
│  1. Build frontend                  │
│  2. az login (Service Principal)    │
│  3. Sync secrets → Azure            │
│  4. Zip backend/ (sin .venv/data/)  │
│  5. az webapp deploy --type zip     │
│  6. Print URL                       │
└─────────────────────────────────────┘
      │
      ▼
Azure App Service actualizado ✅
```

### ¿Por qué el deploy va a `develop` y no a `main`?

`develop` es la rama activa donde vas mergeando features. `main` es para releases etiquetados (v1.0.0, v1.1.0). Desplegar desde `develop` da un ciclo corto y ágil: feature mergeada = en producción.

`main` queda limpio como snapshot estable con `git tag`.

### ¿Por qué dos jobs separados?

Con dos jobs (`ci` + `deploy`) obtienes:

1. **CI corre en PRs** — detectas errores antes de mergear, no después.
2. **`needs: ci`** — si el build falla, el deploy ni se intenta.
3. **Logs independientes** — en la UI de GitHub ves claramente qué parte falló.

---

## 5. Autenticación GitHub → Azure

### Opción A: Publish Profile (legacy, no usar)

Un XML con credenciales del App Service. Problemas: expira, tiene más permisos de los necesarios, no es auditable.

### Opción B: Service Principal con RBAC (la correcta)

Un **Service Principal** es una "cuenta de aplicación" en Azure Active Directory — como un usuario, pero para scripts y servicios automáticos.

**Ventajas:**
- Permisos mínimos (RBAC): solo puede tocar el App Service específico.
- Auditable: Azure registra qué hizo, cuándo, desde dónde.
- Puede ejecutar cualquier comando `az` en el job.
- No expira automáticamente.

### Crear el Service Principal

```bash
# Obtén tu Subscription ID
az account show --query id -o tsv

# Crea el SP con acceso mínimo solo a tu App Service
az ad sp create-for-rbac \
  --name "github-cohabit-deploy" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/Microsoft.Web/sites/<APP_NAME> \
  --sdk-auth
```

El flag `--sdk-auth` genera el JSON en el formato exacto que espera `azure/login@v2`.

**Output (ejemplo):**
```json
{
  "clientId":       "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret":   "abc123~defghijklmnop",
  "subscriptionId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "tenantId":       "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
  ...
}
```

Este JSON completo va al secreto `AZURE_CREDENTIALS`.

### ¿Qué es RBAC?

**Role-Based Access Control** — permisos de Azure. En lugar de acceso total a la suscripción, asignas un rol sobre un scope específico:

- **Rol `contributor`** sobre un App Service = puede leer, modificar y deployar ese App Service. Nada más.
- **Scope** = `…/resourceGroups/rg/providers/Microsoft.Web/sites/appname` → solo este recurso.

Principio de mínimo privilegio: el script tiene exactamente lo que necesita, nada más.

---

## 6. Secretos en GitHub Actions

Valores encriptados almacenados en GitHub que **nunca aparecen en logs**.

### Cómo funcionan

1. Los guardas en GitHub → Settings → Secrets and variables → Actions.
2. Los referencias con `${{ secrets.NOMBRE }}` en el workflow.
3. GitHub los inyecta al runner en tiempo de ejecución.
4. Si un step los imprime por error, GitHub los reemplaza con `***`.

```yaml
- run: echo ${{ secrets.SECRET_KEY }}
# Log: echo ***
```

### Secretos requeridos

| Secreto | Descripción | Cómo obtenerlo |
|---|---|---|
| `AZURE_CREDENTIALS` | JSON completo del Service Principal | `az ad sp create-for-rbac ... --sdk-auth` |
| `AZURE_WEBAPP_NAME` | Nombre del App Service | Azure Portal → App Service → nombre |
| `AZURE_RESOURCE_GROUP` | Nombre del Resource Group | Azure Portal → Resource Groups |
| `SECRET_KEY` | Clave para firmar JWT | Mismo valor de tu `.env` local |
| `ENVIRONMENT` | `production` | Literal |

### ¿Por qué sincronizar `SECRET_KEY` desde GitHub y no dejarlo fijo en Azure?

GitHub Secrets se convierte en la **fuente de verdad única**:

- Si lo cambias, lo actualizas en un lugar.
- El workflow lo sincroniza en cada deploy → Azure siempre alineado.
- Si onboardeas a alguien, pueden ver qué variables existen (sin ver los valores).

Si lo dejaras fijo en Azure podrías actualizar uno y olvidarte del otro.

---

## 7. Los dos jobs: `ci` y `deploy`

### Job `ci` — Build Check

**Trigger:** PR abierto o actualizado hacia `develop`.

**Steps:**

```
npm ci
  └─ Instala dependencias con versiones exactas del lockfile
  └─ Reproducible: misma instalación siempre, en cualquier máquina

npm run build
  └─ Compila React + Tailwind → backend/frontend/dist/
  └─ Falla si hay imports rotos, JSX inválido, etc.

pip install -r requirements.txt
  └─ Verifica que las dependencias del backend instalan sin conflictos

python -m py_compile backend/app/**/*.py
  └─ Verifica sintaxis Python en todos los archivos
  └─ Reemplazar con pytest cuando haya tests
```

**¿Por qué `npm ci` y no `npm install`?**

| | `npm install` | `npm ci` |
|---|---|---|
| Usa el lockfile | Puede actualizarlo | Siempre, sin excepciones |
| Limpia node_modules | No | Sí (siempre fresh) |
| Velocidad en CI | Más lento (resuelve versiones) | Más rápido (lockfile directo) |
| Falla si lockfile desactualizado | No | Sí |

En local usas `npm install` (flexible), en CI usas `npm ci` (reproducible).

### Job `deploy` — Deploy to Azure

**Trigger:** Push a `develop` (= PR mergeado). Solo si `ci` pasó (`needs: ci`).

**¿Por qué el zip excluye `.venv`?**

El `.venv` instalado en tu macOS tiene binarios compilados para macOS. Azure corre Linux — esos binarios son incompatibles (`Exec format error`). `startup.sh` corre `pip install` en cada arranque, generando el `.venv` correcto para Linux dentro del contenedor.

**¿Por qué `--type zip` en el deploy?**

Equivale exactamente a lo que hace `deploy.sh`. Azure recibe el zip, lo extrae en `/home/site/wwwroot/`, y llama `startup.sh`. No activa el builder de Oryx (que intentaría hacer su propio `pip install` y `npm build`), porque ya traemos todo pre-compilado.

---

## 8. Branch protection rules

Reglas de GitHub que controlan qué puede ocurrir en una rama.

### Por qué son necesarias

Sin protección, puedes hacer `git push origin develop` directamente, sin PR, sin CI. Con protección:

- Nadie puede hacer push directo a `develop` (ni tú mismo).
- Todos los PRs deben pasar CI antes de mergearse.
- El historial es trazable: cada cambio en `develop` vino de un PR aprobado.

### Cómo configurarlas

GitHub → tu repo → Settings → Branches → Add branch protection rule:

**Branch name pattern:** `develop`

| Regla | Activar | Por qué |
|---|---|---|
| Require a pull request before merging | ✅ | Nadie pushea directo |
| Require status checks to pass | ✅ | CI debe pasar |
| Status check: `Build Check` | ✅ | Nombre exacto del job `ci` en el YAML |
| Do not allow bypassing | ✅ | Ni el owner lo puede saltear |

**Importante:** El nombre del status check debe coincidir con el campo `name:` del job en el workflow. En nuestro caso es `Build Check`.

---

## 9. Implementación paso a paso

### Paso 1 — Crear el Service Principal

```bash
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RESOURCE_GROUP="cohabit-finance-rg"
APP_NAME="cohabit-finance"

az ad sp create-for-rbac \
  --name "github-cohabit-deploy" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME \
  --sdk-auth
```

Copia el JSON completo del output. Lo necesitas en el siguiente paso.

### Paso 2 — Agregar secretos en GitHub

GitHub → tu repo → Settings → Secrets and variables → Actions → **New repository secret**:

```
AZURE_CREDENTIALS    → JSON completo del paso 1
AZURE_WEBAPP_NAME    → cohabit-finance
AZURE_RESOURCE_GROUP → cohabit-finance-rg
SECRET_KEY           → valor de SECRET_KEY en tu .env
ENVIRONMENT          → production
```

### Paso 3 — El workflow ya está en `.github/workflows/azure-deploy.yml`

El archivo fue creado durante la implementación. Puedes revisarlo en esa ruta.

Los dos jobs están definidos:
- `ci` (Build Check): corre en PRs hacia `develop`
- `deploy` (Deploy to Azure): corre en push a `develop`, requiere que `ci` haya pasado

### Paso 4 — Configurar branch protection

GitHub → Settings → Branches → Add rule:

- Branch name: `develop`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass → busca **Build Check**
- ✅ Do not allow bypassing

> El status check `Build Check` aparece en la lista solo después de que el workflow haya corrido al menos una vez. Si no aparece aún, completa el Paso 5 primero y luego vuelve.

### Paso 5 — Probar el pipeline

```bash
# Crea una rama de test desde develop
git checkout develop
git checkout -b test/cicd-setup

# Haz un cambio mínimo
echo "" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push origin test/cicd-setup
```

Abre un Pull Request desde `test/cicd-setup` hacia `develop` en GitHub.

Deberías ver en la sección de checks del PR:

```
✅ Build Check — passed in ~1m 30s
```

Mergea el PR. En la pestaña **Actions** del repo verás el job `Deploy to Azure` iniciando automáticamente.

---

## 10. Decisiones de diseño

| Decisión | Alternativa considerada | Por qué se eligió esto |
|---|---|---|
| Deploy disparado por push a `develop` | Push a `main` | `develop` es la rama activa; `main` es para releases etiquetados con `git tag` |
| Service Principal + RBAC | Publish Profile | Más seguro, permisos mínimos, no expira automáticamente, auditable |
| `npm ci` | `npm install` | Reproducible: versiones exactas del lockfile, limpia node_modules cada vez |
| `py_compile` para validar Python | No validar / pytest | Sin tests unitarios aún; `py_compile` detecta SyntaxErrors sin configuración extra |
| Sync de secrets en cada deploy | Configurarlos solo una vez en Azure Portal | GitHub Secrets = única fuente de verdad; siempre alineados |
| `az webapp deploy --type zip` | Container deploy / Oryx build | Idéntico al `deploy.sh` manual; predecible, rápido, sin sorpresas |
| `needs: ci` en el job deploy | Jobs independientes | Garantiza que nunca se deploya código que no compiló |
| Un solo archivo `.yml` | Archivos separados por job | Toda la lógica de CI/CD en un lugar; más fácil de mantener y entender |

---

## 11. Troubleshooting

### CI falla en "Build frontend"

El error está en React/JS. Ve a Actions → run fallido → step "Build frontend" para ver el error exacto. Causas más comunes:

- Import de componente o archivo que no existe
- Error de sintaxis JSX
- Variable usada antes de ser definida

Corrige en tu rama y haz push — el CI vuelve a correr automáticamente.

---

### Deploy falla en "Login to Azure"

**Error:** `AADSTS70011: The provided value for scope is not valid`
→ El Service Principal expiró o fue eliminado. Recréalo con `az ad sp create-for-rbac` y actualiza `AZURE_CREDENTIALS` en GitHub Secrets.

**Error:** `Insufficient privileges to complete the operation`
→ El `--scopes` del comando de creación no apuntaba al App Service correcto. Verifica que el resource group y app name en el scope coincidan con los reales.

---

### Deploy completo pero el sitio está caído

`startup.sh` falló al iniciar. Ve a Azure Portal → App Service → **Log stream** para ver los logs en tiempo real. Error más común: una dependencia de Python que no instala (`pip install` fallando en `requirements.txt`).

---

### El status check no aparece en branch protection

El job debe haber corrido al menos una vez para que GitHub lo registre. Abre un PR de prueba (aunque sea con un cambio mínimo), espera que corra el CI y aparezca como `Build Check`. Luego vuelve a configurar la branch protection rule.

---

### Error "Resource not found" en az webapp deploy

Los nombres del App Service o Resource Group son incorrectos o tienen mayúsculas distintas. Los valores de `AZURE_WEBAPP_NAME` y `AZURE_RESOURCE_GROUP` en GitHub Secrets deben coincidir **exactamente** con Azure (case-sensitive).

Verifica con:
```bash
az webapp list --output table
```
