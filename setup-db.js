// One-time setup script: creates the users, weights, steps, measurement_types,
// measurements, photos, and training tables - one small file per table, see setup/.
// Run this once with: node setup-db.js
// Safe to run again later too - "IF NOT EXISTS" means it won't wipe existing tables/data.

const pool = require('./db');
const createUsersTable = require('./setup/create-users-table');
const createWeightsTable = require('./setup/create-weights-table');
const createStepsTable = require('./setup/create-steps-table');
const createMeasurementTypesTable = require('./setup/create-measurement-types-table');
const createMeasurementsTable = require('./setup/create-measurements-table');
const createPhotosTable = require('./setup/create-photos-table');
const createTrainingTable = require('./setup/create-training-table');

async function setupDatabase() {
    await createUsersTable();
    await createWeightsTable();
    await createStepsTable();
    await createMeasurementTypesTable();
    await createMeasurementsTable();
    await createPhotosTable();
    await createTrainingTable();

    console.log('Tables created (or already existed). Setup complete.');
    await pool.end(); // close the connection so the script actually exits
}

setupDatabase();
