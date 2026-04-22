/**
 * Plantilla: componente standalone (Angular 20, sin NgModule).
 * Copia a frontend/src/app/components/mi-feature/mi-feature.component.ts
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mi-feature',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mi-feature.component.html',
  styleUrl: './mi-feature.component.css',
})
export class MiFeatureComponent {}
