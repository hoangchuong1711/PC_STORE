# PC Store

Project status and local setup instructions. The backend implementation guide is in [`backend/BACKEND_GUIDE.md`](backend/BACKEND_GUIDE.md).

## Backend (T02)

The backend is a Java 21 Maven WAR for Tomcat 10.1. It uses Jakarta Servlet, Hibernate/JPA, and PostgreSQL. The health endpoint is `GET /api/health`; it returns JSON and checks PostgreSQL through JPA.

### Requirements

- JDK 21 and Maven 3.9+
- Apache Tomcat 10.1
- PostgreSQL 14 or later, running locally or on a reachable development server

Create an empty database named `pc_store` and a PostgreSQL user for development. The database schema and migrations belong to T03; this task does not create business tables.

### Build and deploy (PowerShell)

From the repository root:

```powershell
Set-Location backend
mvn clean package
```

The deployable artifact is `backend/target/pc-store-backend.war`. Set Tomcat's installation path and the database connection variables in the same PowerShell session that starts Tomcat:

```powershell
$env:CATALINA_HOME = 'C:\tools\apache-tomcat-10.1.x'
$env:DB_URL = 'jdbc:postgresql://localhost:5432/pc_store'
$env:DB_USER = 'pc_store_app'
$env:DB_PASSWORD = 'password'
Copy-Item .\target\pc-store-backend.war "$env:CATALINA_HOME\webapps\pc-store-backend.war"
& "$env:CATALINA_HOME\bin\catalina.bat" run
```

Keep the password local; do not commit it. Tomcat reads these environment variables from its own process, so setting them in a different terminal will not configure an already-running Tomcat.

After Tomcat deploys the WAR, open `http://localhost:8080/pc-store-backend/api/health`. A healthy response is similar to:

```json
{"status":"ok","application":"pc-store-backend","database":"connected"}
```

If the database is unreachable or its environment variables are missing, the endpoint returns HTTP 503 and a generic JSON message. Details are written to the Tomcat log. Schema creation is deliberately not automatic: Hibernate validates mappings, while T03's migration will own schema creation.

### Run from IntelliJ IDEA with Smart Tomcat

This repository has no JSP or static web pages, so the webapp directory is only a deployment root for the Servlet application. Smart Tomcat loads the compiled classes and libraries from the selected module; it does not need the compiled WAR directory as its Deployment Directory. The plugin's documented setup expects a source webapp directory inside the project/module. See the [SmartTomcat setup guide](https://github.com/zengkid/SmartTomcat#user-guide).

1. Open the repository in IntelliJ IDEA and reload the Maven project. Select the `backend` Maven module for the Smart Tomcat configuration.
2. Create a Smart Tomcat run configuration and select the installed **Tomcat 10.1** server.
3. Set **Deployment Directory** to `<repo>\backend\src\main\webapp` (or the equivalent absolute path on your machine). Do not point it at `backend\target\pc-store-backend` or Tomcat's `webapps` directory.
4. Set **Context Path** to `/pc-store-backend` so the endpoint URL matches the example above. If you keep the plugin's default context path, use that path in the URL instead.
5. In **Env Options**, provide `DB_URL`, `DB_USER`, and `DB_PASSWORD` for the local PostgreSQL database. Keep real credentials in the local run configuration; do not commit them.
6. Build/rebuild the `backend` module, start the configuration, then request `http://localhost:8080/pc-store-backend/api/health`.

The tracked `backend/src/main/webapp/.gitkeep` keeps the source deployment directory present in a fresh clone. If Smart Tomcat reports that it cannot find the deployment directory, check that this exact path exists and that the run configuration selects the `backend` module.

## Project scope

Implementation follows `docs/scope.md`, `docs/architecture.md`, and `backend/BACKEND_GUIDE.md`. The repo is being built in CORE → FEATURE → ADVANCED order; planned designs are not evidence that a feature is implemented.
