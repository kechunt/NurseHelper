/**
 * DTOs para pacientes
 */

import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, Max, Length, IsNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  identificationNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  gender?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  emergencyRelation?: string;

  @IsOptional()
  @IsString()
  medicalObservations?: string;

  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @IsOptional()
  @IsString()
  generalObservations?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  identificationNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  gender?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  emergencyRelation?: string;

  @IsOptional()
  @IsString()
  medicalObservations?: string;

  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @IsOptional()
  @IsString()
  generalObservations?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areaId?: number | null;
}

export class SaveObservationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  observation: string;

  /**
   * Categoría de la nota (se guarda en `patient_clinical_notes` con autor y fecha server-side).
   * Tipos: general | medical | diagnosis | allergies | specialNeeds.
   */
  @IsOptional()
  @IsIn(['general', 'medical', 'diagnosis', 'allergies', 'specialNeeds'])
  scope?: 'general' | 'medical' | 'diagnosis' | 'allergies' | 'specialNeeds';
}
