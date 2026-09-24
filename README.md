# Kandinsky: Visual Analytics for the Avant-Garde

Kandinsky is a visual analytics application for exploring avant-garde artists and exhibitions. It consists of an Angular frontend, a Node/Express API, and a Neo4j database.

_(Click to enlarge)_  
[![Kandinsky interface](https://github.com/user-attachments/assets/d8463bef-2e05-421f-b4c0-d55e64cce301)](https://github.com/user-attachments/assets/d8463bef-2e05-421f-b4c0-d55e64cce301)

## Quick start with Docker Compose

Requirements:

- Docker Engine or Docker Desktop with Docker Compose v2
- Approximately 1 GB of free disk space for images, the downloaded dump, and the imported database
- Network access to Zenodo on the first start

Create a local environment file and replace the placeholder with a strong password:

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead. Then start the complete application:

```bash
docker compose up --build
```

Open <http://localhost:4200>. The Neo4j Browser is available at <http://localhost:7474> when direct database inspection is needed.

To verify the frontend proxy, API, and imported database together, request:

```bash
curl http://localhost:4200/api/health
```

A healthy response has the form `{"status":"ok","records":123}` with a positive record count.

On the first run, Compose downloads `artvis-db.dump` from the published Zenodo record, verifies MD5 `6f80deaee39b326466b6279841d2f498`, and imports it with Neo4j **4.4.5** before the API starts. The dump and imported database are stored in named Docker volumes and are reused on subsequent starts. The 382 MB dump is never added to Git.

The optional Gemini-backed feature requires a key. Set `GEMINI_API_KEY` only in the untracked `.env` file; the rest of the application runs without it.

## Stop, restart, and reset

Stop the containers while retaining the downloaded dump and database:

```bash
docker compose down
```

Start again with `docker compose up --build`; the verified persistent data will be reused.

To perform a destructive clean reset, including the downloaded dump and imported Neo4j data:

```bash
docker compose down --volumes
```

The next `docker compose up --build` downloads and imports the dataset again.

## Services

- `frontend`: production Angular build served by Nginx at port 4200; `/api` requests are proxied internally to the backend.
- `backend`: Node/Express API connected to `bolt://neo4j:7687` through the Compose network.
- `neo4j`: Neo4j 4.4.5 with persistent storage.
- `dataset` and `neo4j-init`: one-shot first-start download, checksum verification, and import steps.

## Dataset and attribution

The application uses the published Kandinsky dataset:

- Dataset DOI: [10.5281/zenodo.22933343](https://doi.org/10.5281/zenodo.22933343)
- File: `artvis-db.dump`
- MD5: `6f80deaee39b326466b6279841d2f498`
- Dataset license: **Creative Commons Attribution 4.0 International (CC BY 4.0)**

The dataset is based on DoME: Bartosch et al. (2020), [https://doi.org/10.4324/9780429505188-36](https://doi.org/10.4324/9780429505188-36).

## Software license and citation

The repository software is licensed separately under the [MIT License](LICENSE). The dataset's CC BY 4.0 license applies to the published dataset, not to the software source code.

Citation metadata for the software is provided in [`CITATION.cff`](CITATION.cff). No software DOI is asserted here; the dataset DOI above identifies only the dataset.

## Local development without containers

Install dependencies and build each application with the lockfiles:

```bash
cd frontend
npm ci
npm run build

cd ../backend
npm ci
npm run build
```

For local development, configure the backend environment variables used in `backend/src/db.js`: `PORT`, `url`, `db_username`, `db_password`, `database`, and optionally `API_KEY`.
