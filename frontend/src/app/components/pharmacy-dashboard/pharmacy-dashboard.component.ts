import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';

interface MedicationRequest {
  id: number;
  requestId: string;
  requestedBy: string;
  requestedAt: string;
  medication: string;
  dosage: string;
  quantity: number;
  patients: PatientMedication[];
  status: 'pending' | 'in_preparation' | 'ready' | 'delivered';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
  medicationId?: number;
  availableInStock?: boolean;
  stockAvailable?: number;
}

interface PatientMedication {
  patientName: string;
  bedNumber: string;
  areaName?: string;
  doses: MedicationDose[];
}

interface MedicationDose {
  time: string;
  quantity: string;
  administered: boolean;
}

interface DeliveryHistoryItem {
  id: number;
  deliveryId: string;
  medication: string;
  dosage: string;
  quantity: number;
  requestedBy: string;
  deliveredAt: string;
  deliveredBy: string;
  patients: string[];
  notes: string;
}

interface InventoryItem {
  id?: number;
  medication: string;
  dosage: string;
  stock: number;
  minStock: number;
  location: string;
  expiryDate: string;
  status: 'available' | 'low_stock' | 'expired' | 'out_of_stock';
}

@Component({
  selector: 'app-pharmacy-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-dashboard.component.html',
  styleUrl: './pharmacy-dashboard.component.css',
})
export class PharmacyDashboardComponent implements OnInit {
  pharmacyUserName: string = 'Farmacia Central';
  
  pendingRequestsCount: number = 0;
  inPreparationCount: number = 0;
  readyForDeliveryCount: number = 0;
  deliveredTodayCount: number = 0;

  medicationRequests: MedicationRequest[] = [];
  filteredRequests: MedicationRequest[] = [];

  deliveryHistory: DeliveryHistoryItem[] = [];
  filteredHistory: DeliveryHistoryItem[] = [];

  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];

  requestFilter: string = 'all';
  searchTerm: string = '';
  historySearchTerm: string = '';
  inventorySearchTerm: string = '';

  activeSection: string = 'requests';

  showDeliveryModal: boolean = false;
  selectedRequest: MedicationRequest | null = null;
  deliveryNotes: string = '';
  
  // Mapa para rastrear disponibilidad de medicamentos en solicitudes
  medicationAvailability: Map<number, boolean> = new Map();

  constructor(
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.pharmacyUserName = `${currentUser.firstName} ${currentUser.lastName}`;
    }
    this.loadData();
  }

  loadData(): void {
    this.pharmacyService.getInventory().subscribe({
      next: (inventory) => {
        this.inventory = inventory.map(i => ({
          id: i.id,
          medication: i.name,
          dosage: i.dosage,
          stock: i.stock,
          minStock: i.minStock,
          location: i.location || 'N/A',
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : 'N/A',
          status: i.status
        }));
        
        this.filteredInventory = this.inventory;
        
        this.loadRequests();
        this.loadHistory();
      },
      error: (error) => {
        console.error('Error cargando inventario:', error);
        this.inventory = [];
        this.filteredInventory = [];
        this.loadRequests();
        this.loadHistory();
      }
    });
  }

  loadRequests(): void {
    this.pharmacyService.getMedicationRequests().subscribe({
      next: (requests) => {
        this.medicationRequests = requests.map(r => {
          // Verificar disponibilidad en inventario
          const medicationInInventory = this.inventory.find(
            inv => inv.medication === r.medication.name && inv.dosage === r.dosage
          );
          const isAvailable = medicationInInventory ? 
            (medicationInInventory.stock >= r.quantity && medicationInInventory.status !== 'out_of_stock') : 
            false;
          
          // Inicializar disponibilidad si no existe
          if (!this.medicationAvailability.has(r.id)) {
            this.medicationAvailability.set(r.id, isAvailable);
          }
          
          return {
            id: r.id,
            requestId: r.requestId,
            requestedBy: `${r.requestedBy.firstName} ${r.requestedBy.lastName} (Enfermera)`,
            requestedAt: new Date(r.createdAt).toLocaleString('es-ES'),
            medication: r.medication.name,
            dosage: r.dosage,
            quantity: r.quantity,
            patients: r.patientsInfo || [],
            status: r.status,
            priority: r.priority,
            notes: r.notes || '',
            medicationId: r.medication.id,
            availableInStock: isAvailable,
            stockAvailable: medicationInInventory?.stock || 0
          };
        });
        
        this.filteredRequests = this.medicationRequests;
        this.updateCounters();
        console.log('✅ Solicitudes cargadas:', this.medicationRequests.length);
      },
      error: (error) => {
        console.error('Error cargando solicitudes:', error);
        alert('Error al cargar las solicitudes. Por favor, recarga la página.');
        this.medicationRequests = [];
        this.filteredRequests = [];
        this.updateCounters();
      }
    });
  }

  loadHistory(): void {
    this.pharmacyService.getDeliveryHistory().subscribe({
      next: (history) => {
        this.deliveryHistory = history.map(h => ({
          id: h.id,
          deliveryId: h.deliveryId,
          medication: h.medication.name,
          dosage: h.dosage,
          quantity: h.quantity,
          requestedBy: `${h.requestedBy.firstName} ${h.requestedBy.lastName}`,
          deliveredAt: new Date(h.deliveredAt).toLocaleString('es-ES'),
          deliveredBy: `${h.deliveredBy.firstName} ${h.deliveredBy.lastName}`,
          patients: h.patients || [],
          notes: h.notes || 'Sin observaciones'
        }));
        
        this.filteredHistory = this.deliveryHistory;
        this.updateCounters();
        console.log('✅ Historial cargado:', this.deliveryHistory.length);
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.deliveryHistory = [];
        this.filteredHistory = [];
      }
    });
  }


  updateCounters(): void {
    this.pendingRequestsCount = this.medicationRequests.filter(r => r.status === 'pending').length;
    this.inPreparationCount = this.medicationRequests.filter(r => r.status === 'in_preparation').length;
    this.readyForDeliveryCount = this.medicationRequests.filter(r => r.status === 'ready').length;
    
    const today = new Date().toDateString();
    this.deliveredTodayCount = this.deliveryHistory.filter(h => {
      return new Date(h.deliveredAt).toDateString() === today;
    }).length;
  }

  filterRequests(): void {
    this.filteredRequests = this.medicationRequests.filter(req => {
      const matchesSearch = !this.searchTerm ||
        req.medication.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.requestFilter === 'all' || req.status === this.requestFilter;

      return matchesSearch && matchesStatus;
    });
  }

  filterHistory(): void {
    this.filteredHistory = this.deliveryHistory.filter(item => {
      return !this.historySearchTerm ||
        item.medication.toLowerCase().includes(this.historySearchTerm.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(this.historySearchTerm.toLowerCase());
    });
  }

  filterInventory(): void {
    this.filteredInventory = this.inventory.filter(item => {
      return !this.inventorySearchTerm ||
        item.medication.toLowerCase().includes(this.inventorySearchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(this.inventorySearchTerm.toLowerCase());
    });
  }

  changeSection(section: string): void {
    this.activeSection = section;
  }

  toggleMedicationAvailability(request: MedicationRequest): void {
    const currentAvailability = this.medicationAvailability.get(request.id) || false;
    const newAvailability = !currentAvailability;
    
    this.medicationAvailability.set(request.id, newAvailability);
    request.availableInStock = newAvailability;
    
    if (!newAvailability && request.status === 'pending') {
      request.notes = (request.notes || '') + ' [Medicamento no disponible en inventario - Requiere solicitud externa]';
    }
  }

  isMedicationAvailable(request: MedicationRequest): boolean {
    return this.medicationAvailability.get(request.id) ?? (request.availableInStock || false);
  }

  changeRequestStatus(request: MedicationRequest, newStatus: 'pending' | 'in_preparation' | 'ready' | 'delivered'): void {
    const isAvailable = this.isMedicationAvailable(request);
    
    if (!isAvailable && (newStatus === 'in_preparation' || newStatus === 'ready')) {
      const confirmMessage = `⚠️ Este medicamento no está disponible en inventario.\n\n¿Deseas continuar marcándolo como "${newStatus === 'in_preparation' ? 'En Preparación' : 'Listo'}" de todas formas?\n\nNota: Deberás solicitar el medicamento externamente.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.pharmacyService.updateRequestStatus(request.id, newStatus).subscribe({
      next: () => {
        request.status = newStatus;
        
        const statusMessages: { [key: string]: string } = {
          'in_preparation': '🔄 Solicitud en preparación',
          'ready': '✅ Solicitud lista para entregar',
          'delivered': '📦 Solicitud marcada como entregada'
        };

        alert(statusMessages[newStatus] || 'Estado actualizado');
        this.updateCounters();

        if (newStatus === 'ready') {
          alert('✅ Medicamento listo. Puede entregarse cuando la enfermera lo recoja.');
        }
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        alert('Error al actualizar el estado');
      }
    });
  }

  openDeliveryModal(request: MedicationRequest): void {
    this.selectedRequest = request;
    this.deliveryNotes = '';
    this.showDeliveryModal = true;
  }

  closeDeliveryModal(): void {
    this.showDeliveryModal = false;
    this.selectedRequest = null;
    this.deliveryNotes = '';
  }

  confirmDelivery(): void {
    if (!this.selectedRequest) return;

    this.pharmacyService.deliverMedication(this.selectedRequest.id, this.deliveryNotes).subscribe({
      next: (response) => {
        alert(`✅ Entrega confirmada\nID: ${response.deliveryId}`);
        
        this.loadData();
        this.closeDeliveryModal();
      },
      error: (error) => {
        console.error('Error registrando entrega:', error);
        alert('Error al registrar la entrega');
      }
    });
  }

  viewRequestDetails(request: MedicationRequest): void {
    const patientsInfo = request.patients.map(p => 
      `${p.patientName} (${p.bedNumber}):\n${p.doses.map(d => `  - ${d.time}: ${d.quantity}`).join('\n')}`
    ).join('\n\n');

    alert(`📋 Detalles de Solicitud\n\nID: ${request.requestId}\nMedicamento: ${request.medication} ${request.dosage}\nCantidad Total: ${request.quantity}\n\nPacientes:\n${patientsInfo}\n\nNotas: ${request.notes}`);
  }

  updateStock(item: InventoryItem): void {
    if (!item.id) {
      alert('Error: No se pudo identificar el medicamento');
      return;
    }

    const newStock = prompt(`Actualizar stock de ${item.medication} ${item.dosage}\nStock actual: ${item.stock}`, item.stock.toString());
    
    if (newStock && !isNaN(parseInt(newStock)) && parseInt(newStock) >= 0) {
      this.pharmacyService.updateMedicationStock(item.id, parseInt(newStock)).subscribe({
        next: () => {
          this.pharmacyService.getInventory().subscribe({
            next: (inventory) => {
              this.inventory = inventory.map(i => ({
                id: i.id,
                medication: i.name,
                dosage: i.dosage,
                stock: i.stock,
                minStock: i.minStock,
                location: i.location || 'N/A',
                expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : 'N/A',
                status: i.status
              }));
              
              this.filteredInventory = this.inventory;
              
              this.loadRequests();
              
              alert(`✅ Stock actualizado: ${newStock} unidades`);
            },
            error: (error) => {
              console.error('Error recargando inventario:', error);
              alert('✅ Stock actualizado, pero hubo un error al recargar la vista');
            }
          });
        },
        error: (error) => {
          console.error('Error actualizando stock:', error);
          alert('Error al actualizar el stock');
        }
      });
    }
  }

  printReport(): void {
    window.print();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': '⏳ Pendiente',
      'in_preparation': '🔄 Preparando',
      'ready': '✅ Lista',
      'delivered': '📦 Entregada'
    };
    return labels[status] || status;
  }

  getInventoryStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'available': '✓ Disponible',
      'low_stock': '⚠️ Stock Bajo',
      'expired': '🚫 Vencido',
      'out_of_stock': '❌ Sin Stock'
    };
    return labels[status] || status;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

