# Express API Boilerplate

This project serves as a boilerplate for quickly starting new API projects using Express.js. It includes essential configurations, middleware, and helper functions to streamline the development process.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Scripts](#scripts)
- [Folder Structure](#folder-structure)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- Basic CRUD operations with controller and service templates.
- Middleware for authentication and error handling.
- Validation of request bodies using `express-validator`.
- Resource generation script for creating controllers, services, and routes.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd express-api-boilerplate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Scripts

### `package.json` Scripts

- **dev**: Runs the application in development mode using `nodemon`.

  ```json
  "dev": "nodemon app.js"
  ```

- **generate-resource**: A custom script to generate boilerplate files for a new resource (controller, service, and router).
  ```json
  "generate-resource": "node src/scripts/generate-resource.js"
  ```

### Custom Scripts

#### `src/scripts/generate-resource.js`

This script automates the creation of new resource files. It takes a resource name as an argument and generates the following files:

- **Controller**: Handles incoming requests and responses.
- **Service**: Contains business logic and interacts with the database.
- **Router**: Defines the routes for the resource.

**Usage**:
To generate a new resource, run:

```bash
npm run generate-resource <resource-name>
```

For example:

```bash
npm run generate-resource user
```

This will create:

- `src/controllers/user.controller.js`
- `src/services/user.service.js`
- `src/routes/user.router.js`

## Folder Structure

```
├── src
│   ├── controllers          # Contains controller files for handling requests
│   ├── helpers              # Helper functions and templates
│   ├── middlewares          # Custom middleware for authentication and error handling
│   ├── routes               # Route definitions for the API
│   ├── scripts              # Scripts for generating resources
│   └── services             # Business logic and database interactions
├── app.js                   # Main application file
└── package.json             # Project metadata and dependencies
```

## Usage

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Access the API at `http://localhost:3000` (or the port specified in your app).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.
