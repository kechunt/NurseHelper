/**
 * DTOs para medicamentos
 */

import { IsInt, IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsDateString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddMedicationDto {
  @IsInt()
  @Type(() => Number)
  patientId: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  medication: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  dosage: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsArray()
  @IsString({ each: true })
  times: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  days?: string | string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['days', 'weeks', 'months'])
  durationUnit?: 'days' | 'weeks' | 'months';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SuspendMedicationDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  reason: string;

  @IsOptional()
  @IsDateString()
  suspendUntil?: string;
}

export class DeleteMedicationDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  reason: string;
}
