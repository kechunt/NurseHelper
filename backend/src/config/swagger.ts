import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NurseHelper API',
      version: '1.0.0',
      description: 'API REST para el sistema de gestión de enfermeras NurseHelper',
      contact: {
        name: 'NurseHelper Support',
        email: 'support@nursehelper.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: {
              type: 'string',
              enum: ['admin', 'nurse', 'supervisor', 'pharmacy'],
            },
            maxPatients: { type: 'integer', nullable: true },
            assignedAreaId: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Area: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Bed: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            bedNumber: { type: 'string' },
            areaId: { type: 'integer' },
            patientId: { type: 'integer', nullable: true },
            notes: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            identificationNumber: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string' },
            medicalHistory: { type: 'string' },
            allergies: { type: 'string' },
            emergencyContact: { type: 'string' },
            emergencyPhone: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patientId: { type: 'integer' },
            assignedToId: { type: 'integer', nullable: true },
            type: {
              type: 'string',
              enum: ['medication', 'check', 'treatment', 'other'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'missed', 'cancelled'],
            },
            scheduledTime: { type: 'string', format: 'date-time' },
            description: { type: 'string' },
            notes: { type: 'string' },
            medication: { type: 'string' },
            dosage: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Shift: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            type: { type: 'string', enum: ['morning', 'afternoon', 'night'] },
            name: { type: 'string' },
            startTime: { type: 'string', format: 'time' },
            endTime: { type: 'string', format: 'time' },
            isActive: { type: 'boolean' },
          },
        },
        Medication: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            dosage: { type: 'string' },
            description: { type: 'string' },
            stock: { type: 'integer' },
            minStock: { type: 'integer' },
            location: { type: 'string' },
            expiryDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['available', 'low_stock', 'out_of_stock', 'expired'] },
          },
        },
        MedicationRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            requestId: { type: 'string' },
            requestedById: { type: 'integer' },
            medicationId: { type: 'integer' },
            dosage: { type: 'string' },
            quantity: { type: 'integer' },
            patientsInfo: { type: 'array' },
            status: { type: 'string', enum: ['pending', 'in_preparation', 'ready', 'delivered', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            notes: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts', 
    './src/controllers/*.ts',
    './src/app.ts'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NurseHelper API Documentation',
  }) as any);
};

