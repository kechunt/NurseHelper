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
            phone: { type: 'string' },
            address: { type: 'string' },
            medicalHistory: { type: 'string' },
            allergies: { type: 'string' },
            emergencyContact: { type: 'string' },
            emergencyPhone: { type: 'string' },
            emergencyRelation: { type: 'string' },
            medicalObservations: { type: 'string' },
            specialNeeds: { type: 'string' },
            generalObservations: { type: 'string' },
            medications: { type: 'string' },
            treatmentHistory: { type: 'string' },
            pendingTasks: { type: 'string' },
            bed: { $ref: '#/components/schemas/Bed' },
            bedId: { type: 'integer', nullable: true },
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
            patient: { $ref: '#/components/schemas/Patient' },
            assignedToId: { type: 'integer', nullable: true },
            assignedTo: { $ref: '#/components/schemas/User' },
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
            completedAt: { type: 'string', format: 'date-time', nullable: true },
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
            requestedBy: { $ref: '#/components/schemas/User' },
            medicationId: { type: 'integer' },
            medication: { $ref: '#/components/schemas/Medication' },
            dosage: { type: 'string' },
            quantity: { type: 'integer' },
            patientsInfo: { 
              type: 'array',
              items: { type: 'object' }
            },
            status: { type: 'string', enum: ['pending', 'in_preparation', 'ready', 'delivered', 'cancelled'] },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        NurseShift: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nurseId: { type: 'integer' },
            shiftId: { type: 'integer' },
            day: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
            weekStart: { type: 'string', format: 'date' },
            shift: { $ref: '#/components/schemas/Shift' },
            nurse: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DeliveryHistory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            deliveryId: { type: 'string' },
            requestId: { type: 'string' },
            medicationId: { type: 'integer' },
            medication: { $ref: '#/components/schemas/Medication' },
            dosage: { type: 'string' },
            quantity: { type: 'integer' },
            requestedById: { type: 'integer' },
            requestedBy: { $ref: '#/components/schemas/User' },
            deliveredById: { type: 'integer' },
            deliveredBy: { $ref: '#/components/schemas/User' },
            patients: { 
              type: 'array',
              items: { type: 'string' }
            },
            notes: { type: 'string' },
            deliveredAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AdministrationHistory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patientId: { type: 'integer' },
            patient: { $ref: '#/components/schemas/Patient' },
            scheduleId: { type: 'integer' },
            schedule: { $ref: '#/components/schemas/Schedule' },
            medicationId: { type: 'integer' },
            medication: { $ref: '#/components/schemas/Medication' },
            administeredById: { type: 'integer' },
            administeredBy: { $ref: '#/components/schemas/User' },
            status: { type: 'string', enum: ['administered', 'not_administered', 'missed'] },
            reasonNotAdministered: { type: 'string' },
            notes: { type: 'string' },
            administeredAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'integer' },
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

