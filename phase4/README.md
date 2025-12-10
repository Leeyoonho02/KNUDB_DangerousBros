## Team 5 - Dangerous Bros (Phase 4)

1. Project Overview
This project builds a web application using the database schema designed in previous phases. It provides a web interface for the business logic previously handled by a console-based JDBC application.

2. Development Environment
   - OS: macOS / Windows
   - Language: JavaScript (Node.js)
   - Framework: Node.js
   - Database: Oracle Database
   - Library: oracledb for database connectivity

3. Installation & Execution

   (1) Create DB (DDL, DML)
   - Use the provided DDL and DML scripts to create the database schema and populate it with initial data.

   (2) Install Dependencies
      ```
      npm install
      ```

   (3) Configuration
   - Ensure the .env file is configured with the correct Oracle DB credentials.
   - Put your Oracle DB credentials in the .env file.

   (4) Run Server
   ```
   node app.js
   ```

   (5) Access
   - Open a browser and navigate to: http://localhost:3000

4. Features
   - **Authentication**: User Signup and Login (Routes: /auth).
   - **Data Explorer**: View and manage database records (Routes: /explorer).
   - **My Page**: User-specific data management (Routes: /mypage).
   - **Statistics**: View data insights and reports (Routes: /statistics).

5. Demo Video
   - YouTube Link: 

6. Notes
   - Please ensure the Oracle Database service is active before starting the Node.js server.