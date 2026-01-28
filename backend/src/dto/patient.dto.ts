/**
 * DTOs para pacientes
 */

import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, Max, Length, IsNotEmpty } from 'class-validator';
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
}

export class SaveObservationDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  observation: string;
}
