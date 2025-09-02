# Visualizing the Avant-Garde: Data-Driven Insights into Artist Connections

> This project originated as part of my Bachelor studies under the working title “Exploring Avant-Garde: Visualizing Clusters of Exhibited Artists” and was further developed and refined in collaboration with the Department of Art History at TU Wien. It enables art historians to explore relationships between co-exhibited artists and examine meaningful clusters through interactive visualizations and analytical components provided in the dashboard.
>
> Special thanks to my supervisor, Raphael Buchmüller, for his valuable input on design decisions and overall project direction.

## Final Dashboard (Used in Thesis)
_(Click to enlarge)_  
[![Click to enlarge](https://github.com/user-attachments/assets/d8463bef-2e05-421f-b4c0-d55e64cce301)]([https://github.com/user-attachments/assets/d9a7db17-ed59-4b67-8533-edf1ffd4933f](https://github.com/user-attachments/assets/d8463bef-2e05-421f-b4c0-d55e64cce301))

For a structured overview of the project, including motivation, visualization techniques, and final evaluation, see the [final colloquium slides (PDF)](docs/colloquium_slides.pdf).
You can also view the [earlier milestone presentation slides (PDF)](docs/early_project_presentation.pdf), which show the dashboard and project state at the end of my official project, before further refinement for the final thesis.

## Tech Stack

- **Frontend**: Angular, Typescript, HTML, CSS, D3.js
- **Backend**: Javascript, Node.js, Express.js
- **Database**: Neo4j (via Cypher)
  - Python was used for one-time data preparation, enrichment, and database population. These scripts are not required to run the project and are therefore not included in this repository.


- **Deployment**: Local

## Setup Instructions

This guide provides step-by-step instructions for setting up and running the project.

### 1. Install Node.js
1. Download and install Node.js from the [official website](https://nodejs.org/en/download/).
2. Follow the installation instructions for your operating system.

### 2. Install Angular CLI
1. Open a command prompt or terminal.
2. Run the following command to install Angular CLI:
   ```bash
   npm install -g @angular/cli@17
    ```

### 3. Install Neo4j Desktop
1. Download and install Neo4j Desktop (version 1.5.X) from the [official website](https://neo4j.com/deployment-center/#desktop).
2. Open Neo4j Desktop and create a new project.
3. Click on the project and select "Reveal files in explorer" to open the project folder.
4. Copy the `artvis-db.dump` file from the `database` folder into the revealed folder.
5. In Neo4j Desktop, ensure the `artvis-db.dump` file is visible.
6. Click on the three dots (options) next to the `artvis-db.dump` file and choose "Create new DBMS from dump".
7. Configure the new DBMS with the following settings:
   - **Name**: `artvis-db`
   - **Password**: `24032102`
   - **Version**: `4.4.5`
8. Run the database by clicking the play button.

### 4. Install Required npm Modules
#### Frontend
1. Open a terminal and navigate to the `frontend` folder.
2. Run the following command to install the necessary npm modules:
   ```bash
   npm install
    ```
#### Backend
1. Open a terminal and navigate to the backend folder.
2. Run the following command to install the necessary npm module
    ```bash
   npm install
     ```

### 5. Obtain the `.env` File
The `.env` file contains essential configuration details required to run the project (e.g., API keys, sensitive environment variables). This file is **not included** in the repository for security reasons.

1. **Request the `.env` File:**
   - To obtain the `.env` file, please contact me directly at luisamueller02@web.de.

2. **Add the `.env` File:**
   - Once you receive the file, place the received `.env` file into the `backend` folder.

## How to Run the Project after Setup

1. Open two terminals:
   - One in the `frontend` folder.
   - One in the `backend` folder.
2. In both terminals run:
   ```bash
   npm start
    ```
3. Open your web browser and navigate to http://localhost:4200 to access the website.

