import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  PharmacyService,
  InventoryMovementRow,
  PaginationMeta,
} from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { DashboardShellComponent } from '../../shared/components/dashboard-shell/dashboard-shell.component';
import { AdminTableRowActionsModalComponent } from '../../shared/components/admin-table-row-actions-modal/admin-table-row-actions-modal.component';
import { HeroIconComponent } from '../../shared/components/hero-icon/hero-icon.component';
import { PharmacyShiftAttendanceSectionComponent } from '../pharmacy-shift-attendance-section/pharmacy-shift-attendance-section.component';

interface MedicationRequest {
  id: number;
  requestId: string;
  requestedBy: string;
  requestedAt: string;
  requestedAtRaw?: string | null;
  statusUpdatedAtRaw?: string | null;
  medication: string;
  dosage: string;
  quantity: number;
  patients: PatientMedication[];
  status: 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled';
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
  area?: string;
  areaId?: number;
  patientId?: number;
  doses: MedicationDose[];
}

interface MedicationDose {
  time: string;
  quantity: string;
  administered: boolean;
}

interface DeliveryHistoryItem {
  id: number;
  deliveryId?: string;
  requestId?: string;
  medication: string;
  dosage: string;
  quantity: number;
  requestedBy: string;
  requestedAt?: string | null;
  deliveredAt?: string;
  deliveredAtRaw?: Date; // Fecha original para comparación
  cancelledAt?: string;
  deliveredBy?: string;
  patients?: string[];
  patientsInfo?: PatientMedication[];
  notes: string;
  type: 'delivery' | 'cancelled';
}

interface CombinedHistoryItem extends DeliveryHistoryItem {
  sortDate: Date;
}

type ExpiryClassification = 'none' | 'expired' | 'expiring_soon';

interface InventoryItem {
  id?: number;
  medication: string;
  dosage: string;
  description?: string;
  stock: number;
  minStock: number;
  location: string;
  expiryDate: string;
  expiryDateRaw?: string | null;
  status: 'available' | 'low_stock' | 'expired' | 'out_of_stock';
  /** Alineado con backend (`medications.expiryDate`). */
  expiryClassification: ExpiryClassification;
  daysToExpiry: number | null;
  expiringSoonDays: number;
}

@Component({
  selector: 'app-pharmacy-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardShellComponent,
    AdminTableRowActionsModalComponent,
    HeroIconComponent,
    PharmacyShiftAttendanceSectionComponent,
  ],
  templateUrl: './pharmacy-dashboard.component.html',
  styleUrls: [
    '../../shared/styles/admin-table-unified.css',
    './pharmacy-dashboard.component.css',
  ],
})
export class PharmacyDashboardComponent implements OnInit {
  pharmacyUserName: string = 'Farmacia Central';

  get headerUserName(): string {
    const u = this.authService.currentUser();
    if (u) {
      return `${u.firstName || ''} ${u.lastName || ''}`.trim();
    }
    return this.pharmacyUserName;
  }

  pendingRequestsCount: number = 0;
  inPreparationCount: number = 0;
  readyForDeliveryCount: number = 0;
  deliveredTodayCount: number = 0;

  medicationRequests: MedicationRequest[] = [];
  filteredRequests: MedicationRequest[] = [];

  deliveryHistory: DeliveryHistoryItem[] = [];
  filteredHistory: CombinedHistoryItem[] = [];

  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];

  requestFilter: string = 'all';
  searchTerm: string = '';
  historySearchTerm: string = '';
  inventorySearchTerm: string = '';
  inventoryStatusFilter: 'all' | 'available' | 'low_stock' | 'out_of_stock' | 'expired' | 'expiring_soon' = 'all';

  activeSection: string = 'requests';
  private readonly storageKey = 'pharmacy-dashboard-ui-v1';
  private readonly allowedSections = new Set(['requests', 'history', 'inventory']);

  readonly pharmacySectionOrder: readonly string[] = ['requests', 'history', 'inventory'];

  loadingInventory = false;
  loadingRequests = false;
  loadingHistory = false;
  loadingKardex = false;

  inventoryError = '';
  requestsError = '';
  historyError = '';
  kardexError = '';

  inventoryPagination: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 1 };
  requestsPagination: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 1 };
  historyPagination: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 1 };
  kardexPagination: PaginationMeta = { page: 1, limit: 15, total: 0, totalPages: 1 };

  /** Conteos globales de solicitudes abiertas (BD); evita KPI erróneos al paginar */
  private lastOpenByStatus: { pending: number; in_preparation: number; ready: number } | null = null;
  /** Entregas hoy según BD (independiente de la página del historial) */
  private lastDeliveredTodayCount: number | null = null;

  showDeliveryModal: boolean = false;
  selectedRequest: MedicationRequest | null = null;
  showRequestDetailModal = false;
  selectedRequestDetail: MedicationRequest | null = null;
  selectedRequestForActions: MedicationRequest | null = null;
  deliveryNotes: string = '';
  
  // Modal de rechazo
  showRejectModal: boolean = false;
  rejectionReason: string = '';
  
  // Gestión de inventario
  showAddMedicationModal = false;
  showDeleteMedicationModal = false;
  showStockMovementModal = false;
  selectedMedicationForDelete: InventoryItem | null = null;
  selectedInventoryItem: InventoryItem | null = null;
  selectedInventoryForActions: InventoryItem | null = null;
  stockMovementForm: {
    type: 'entry' | 'exit' | 'adjustment';
    quantity: number;
    reason: string;
    /** Solo entradas: actualiza `expiryDate` del SKU (hasta existir tabla de lotes). */
    entryExpiryDate: string;
  } = {
    type: 'adjustment',
    quantity: 0,
    reason: '',
    entryExpiryDate: '',
  };

  showKardexModal = false;
  kardexItem: InventoryItem | null = null;
  kardexMovements: InventoryMovementRow[] = [];
  kardexLoading = false;
  newMedicationForm: {
    name: string;
    dosage: string;
    description: string;
    stock: number;
    minStock: number;
    location: string;
    expiryDate: string;
  } = {
    name: '',
    dosage: '',
    description: '',
    stock: 0,
    minStock: 50,
    location: '',
    expiryDate: ''
  };
  
  // Historial completo (entregas y rechazos)
  fullHistory: CombinedHistoryItem[] = [];
  selectedHistoryForActions: CombinedHistoryItem | null = null;
  private requestSearchDebounce: ReturnType<typeof setTimeout> | null = null;
  private historySearchDebounce: ReturnType<typeof setTimeout> | null = null;
  private inventorySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.pharmacyUserName = `${currentUser.firstName} ${currentUser.lastName}`;
    }
    this.restoreUiState();
    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (typeof tab === 'string' && this.allowedSections.has(tab)) {
        this.activeSection = tab;
      }
    });
    this.loadData();
  }

  private notifySuccess(message: string): void {
    this.toastService.success(message);
  }

  private notifyError(message: string): void {
    this.toastService.error(message);
  }

  private notifyWarning(message: string): void {
    this.toastService.warning(message);
  }

  private notifyInfo(message: string): void {
    this.toastService.info(message);
  }

  /** Nombre visible + teléfono si el backend lo envía (User en relaciones). */
  private staffContactLabel(
    u: { firstName?: string; lastName?: string; phone?: string | null } | null | undefined,
    suffix?: string
  ): string {
    if (!u) {
      return '—';
    }
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    const ph = u.phone != null && String(u.phone).trim() ? ` · ${String(u.phone).trim()}` : '';
    const suf = suffix ? ` ${suffix}` : '';
    return `${name}${suf}${ph}`;
  }

  loadData(): void {
    this.loadingInventory = true;
    this.inventoryError = '';
    this.pharmacyService
      .getInventoryPaged(this.inventoryPagination.page, this.inventoryPagination.limit)
      .subscribe({
      next: (result) => {
        this.inventoryPagination = result.pagination;
        this.inventory = result.data.map((i) => {
          const expiryClassification =
            i.expiryClassification ?? (i.status === 'expired' ? 'expired' : 'none');
          return {
            id: i.id,
            medication: i.name,
            dosage: i.dosage,
            description: i.description || '',
            stock: i.stock,
            minStock: i.minStock,
            location: i.location || 'N/A',
            expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : 'N/A',
            expiryDateRaw: i.expiryDate || null,
            status: i.status,
            expiryClassification,
            daysToExpiry: i.daysToExpiry ?? null,
            expiringSoonDays: i.expiringSoonDays ?? 30,
          };
        });
        
        this.filterInventory();
        
        this.loadRequests();
        this.loadHistory();
        this.loadingInventory = false;
      },
      error: (error) => {
        console.error('Error cargando inventario:', error);
        this.loadingInventory = false;
        this.inventoryError = error?.error?.message || 'No se pudo cargar el inventario';
        this.inventory = [];
        this.filteredInventory = [];
        this.loadRequests();
        this.loadHistory();
      }
    });
  }

  loadRequests(): void {
    this.loadingRequests = true;
    this.requestsError = '';
    const status = this.requestFilter !== 'all' ? this.requestFilter : undefined;
    forkJoin({
      reqs: this.pharmacyService.getMedicationRequestsPaged(
        this.requestsPagination.page,
        this.requestsPagination.limit,
        status
      ),
      invAll: this.pharmacyService.getInventory(),
    }).subscribe({
      next: ({ reqs, invAll }) => {
        this.requestsPagination = reqs.pagination;
        this.lastOpenByStatus = reqs.openByStatus ?? null;

        this.medicationRequests = reqs.data.map((r) => {
          const medicationInInventory = invAll.find(
            (inv) => inv.name === r.medication.name && inv.dosage === r.dosage
          );
          const isAvailable = medicationInInventory
            ? medicationInInventory.stock >= r.quantity &&
              medicationInInventory.status !== 'out_of_stock'
            : false;

          return {
            id: r.id,
            requestId: r.requestId,
            requestedBy: this.staffContactLabel(r.requestedBy, '(Enfermera)'),
            requestedAt: new Date(r.createdAt).toLocaleString('es-ES'),
            requestedAtRaw: r.createdAt ?? null,
            statusUpdatedAtRaw: (r as any).updatedAt ?? null,
            medication: r.medication.name,
            dosage: r.dosage,
            quantity: r.quantity,
            patients: r.patientsInfo || [],
            status: (r.status || 'pending') as MedicationRequest['status'],
            priority: (r.priority || 'normal') as MedicationRequest['priority'],
            notes: r.notes || '',
            medicationId: r.medication.id,
            availableInStock: isAvailable,
            stockAvailable: medicationInInventory?.stock ?? 0,
          };
        });

        this.filteredRequests = this.medicationRequests;
        this.filterRequests();

        this.updateCounters();

        this.loadingRequests = false;
      },
      error: (error) => {
        console.error('Error cargando solicitudes:', error);
        this.notifyError('Error al cargar las solicitudes. Por favor, recarga la página.');
        this.loadingRequests = false;
        this.requestsError = error?.error?.message || 'No se pudieron cargar las solicitudes';
        this.medicationRequests = [];
        this.filteredRequests = [];
        this.lastOpenByStatus = null;
        this.updateCounters();
      },
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.historyError = '';
    this.pharmacyService
      .getDeliveryHistoryPaged(this.historyPagination.page, this.historyPagination.limit, true)
      .subscribe({
      next: (historyData) => {
        this.historyPagination = historyData.pagination;
        this.lastDeliveredTodayCount =
          historyData.summary?.deliveredTodayCount ?? null;
        // Procesar entregas
        const deliveries = (historyData.deliveries || []).map((h: any) => {
          const deliveredDate = h.deliveredAt ? new Date(h.deliveredAt) : new Date();
          return {
            id: h.id,
            deliveryId: h.deliveryId,
            medication: h.medication.name,
            dosage: h.dosage,
            quantity: h.quantity,
            requestedBy: this.staffContactLabel(h.requestedBy),
            requestedAt: h.requestedAt ?? null,
            deliveredAt: deliveredDate.toLocaleString('es-ES'),
            deliveredAtRaw: deliveredDate, // Guardar fecha original para comparación
            deliveredBy: this.staffContactLabel(h.deliveredBy),
            patients: h.patients || [],
            notes: h.notes || 'Sin observaciones',
            type: 'delivery',
            sortDate: deliveredDate,
          } as CombinedHistoryItem;
        });
        
        // Procesar rechazos
        const cancelled = (historyData.cancelled || []).map((r: any) => {
          const cancelledDate = new Date(r.cancelledAt);
          return {
            id: r.id,
            requestId: r.requestId,
            medication: r.medication.name,
            dosage: r.dosage,
            quantity: r.quantity,
            requestedBy: this.staffContactLabel(r.requestedBy),
            requestedAt: r.requestedAt ?? null,
            cancelledAt: cancelledDate.toLocaleString('es-ES'),
            notes: r.notes || '',
            patientsInfo: r.patientsInfo || [],
            type: 'cancelled',
            sortDate: cancelledDate,
          } as CombinedHistoryItem;
        });
        
        // Combinar y ordenar por fecha
        this.fullHistory = [...deliveries, ...cancelled].sort(
          (a, b) => b.sortDate.getTime() - a.sortDate.getTime()
        );
        
        // Mantener compatibilidad con código existente
        this.deliveryHistory = deliveries;
        this.filteredHistory = this.fullHistory;
        this.filterHistory();
        
        // Actualizar contadores después de cargar historial
        this.updateCounters();
        
        this.loadingHistory = false;
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.loadingHistory = false;
        this.historyError = error?.error?.message || 'No se pudo cargar el historial';
        this.deliveryHistory = [];
        this.filteredHistory = [];
        this.fullHistory = [];
        this.lastDeliveredTodayCount = null;
        this.updateCounters();
      }
    });
  }


  updateCounters(): void {
    if (this.lastOpenByStatus) {
      this.pendingRequestsCount = this.lastOpenByStatus.pending;
      this.inPreparationCount = this.lastOpenByStatus.in_preparation;
      this.readyForDeliveryCount = this.lastOpenByStatus.ready;
    } else {
      this.pendingRequestsCount = this.medicationRequests.filter((r) => r.status === 'pending').length;
      this.inPreparationCount = this.medicationRequests.filter((r) => r.status === 'in_preparation').length;
      this.readyForDeliveryCount = this.medicationRequests.filter((r) => r.status === 'ready').length;
    }

    if (this.lastDeliveredTodayCount != null) {
      this.deliveredTodayCount = this.lastDeliveredTodayCount;
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.deliveredTodayCount = this.fullHistory
        .filter((h) => h.type === 'delivery')
        .filter((h) => {
          const d = new Date(h.sortDate);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        }).length;
    }
    
  }

  filterRequests(): void {
    this.filteredRequests = this.medicationRequests.filter(req => {
      const matchesSearch = !this.searchTerm ||
        req.medication.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.requestFilter === 'all' || req.status === this.requestFilter;

      return matchesSearch && matchesStatus;
    });
    this.persistUiState();
  }

  filterHistory(): void {
    this.filteredHistory = this.fullHistory.filter(item => {
      const matchesSearch = !this.historySearchTerm ||
        item.medication.toLowerCase().includes(this.historySearchTerm.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(this.historySearchTerm.toLowerCase());
      return matchesSearch;
    });
    this.persistUiState();
  }

  filterInventory(): void {
    const search = this.inventorySearchTerm.trim().toLowerCase();
    this.filteredInventory = this.inventory.filter((item) => {
      const expirySearch =
        item.expiryDateRaw &&
        String(item.expiryDateRaw).slice(0, 10).toLowerCase().includes(search);
      const matchesSearch =
        !search ||
        item.medication.toLowerCase().includes(search) ||
        item.location.toLowerCase().includes(search) ||
        (item.description || '').toLowerCase().includes(search) ||
        item.expiryDate.toLowerCase().includes(search) ||
        !!expirySearch;

      if (!matchesSearch) return false;

      if (this.inventoryStatusFilter === 'all') return true;
      if (this.inventoryStatusFilter === 'expired') {
        return item.expiryClassification === 'expired';
      }
      if (this.inventoryStatusFilter === 'expiring_soon') {
        return item.expiryClassification === 'expiring_soon';
      }
      return item.status === this.inventoryStatusFilter;
    });
    this.persistUiState();
  }

  onRequestFilterChange(): void {
    this.requestsPagination.page = 1;
    this.loadRequests();
  }

  setInventoryStatusFilter(filter: 'all' | 'available' | 'low_stock' | 'out_of_stock' | 'expired' | 'expiring_soon'): void {
    this.inventoryStatusFilter = filter;
    this.inventoryPagination.page = 1;
    this.filterInventory();
    this.persistUiState();
  }

  changeSection(section: string): void {
    if (!this.allowedSections.has(section)) {
      return;
    }
    this.activeSection = section;
    this.persistUiState();
    this.router.navigate(['/pharmacy'], { queryParams: { tab: section }, replaceUrl: true });
  }

  onPharmacyTabKeydown(event: KeyboardEvent, currentSection: string): void {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') {
      return;
    }
    event.preventDefault();

    let idx = this.pharmacySectionOrder.indexOf(currentSection);
    if (idx < 0) {
      return;
    }

    if (key === 'Home') {
      idx = 0;
    } else if (key === 'End') {
      idx = this.pharmacySectionOrder.length - 1;
    } else if (key === 'ArrowRight') {
      idx = Math.min(this.pharmacySectionOrder.length - 1, idx + 1);
    } else {
      idx = Math.max(0, idx - 1);
    }

    const next = this.pharmacySectionOrder[idx];
    this.changeSection(next);
    queueMicrotask(() => {
      document.getElementById(`pharmacy-tab-${next}`)?.focus();
    });
  }

  goToRequestsFromLogo(): void {
    this.changeSection('requests');
  }

  goToAttendance(): void {
    this.router.navigate(['/asistencia']);
  }

  /** KPI de solicitudes: mismo módulo, filtro y recarga desde servidor */
  selectRequestKpi(filter: 'pending' | 'in_preparation' | 'ready'): void {
    this.changeSection('requests');
    this.requestFilter = filter;
    this.onRequestFilterChange();
  }

  /** Entregadas hoy: métrica en Solicitudes; acceso al detalle en Historial */
  goToDeliveredTodayDetail(): void {
    this.changeSection('history');
  }

  onRequestSearchChange(value: string): void {
    this.searchTerm = value;
    if (this.requestSearchDebounce) clearTimeout(this.requestSearchDebounce);
    this.requestSearchDebounce = setTimeout(() => {
      this.filterRequests();
      this.persistUiState();
    }, 180);
  }

  onHistorySearchChange(value: string): void {
    this.historySearchTerm = value;
    if (this.historySearchDebounce) clearTimeout(this.historySearchDebounce);
    this.historySearchDebounce = setTimeout(() => {
      this.filterHistory();
      this.persistUiState();
    }, 180);
  }

  onInventorySearchChange(value: string): void {
    this.inventorySearchTerm = value;
    if (this.inventorySearchDebounce) clearTimeout(this.inventorySearchDebounce);
    this.inventorySearchDebounce = setTimeout(() => {
      this.filterInventory();
      this.persistUiState();
    }, 180);
  }

  nextRequestsPage(): void {
    if (this.requestsPagination.page >= this.requestsPagination.totalPages) return;
    this.requestsPagination.page += 1;
    this.loadRequests();
  }

  prevRequestsPage(): void {
    if (this.requestsPagination.page <= 1) return;
    this.requestsPagination.page -= 1;
    this.loadRequests();
  }

  nextHistoryPage(): void {
    if (this.historyPagination.page >= this.historyPagination.totalPages) return;
    this.historyPagination.page += 1;
    this.loadHistory();
  }

  prevHistoryPage(): void {
    if (this.historyPagination.page <= 1) return;
    this.historyPagination.page -= 1;
    this.loadHistory();
  }

  nextInventoryPage(): void {
    if (this.inventoryPagination.page >= this.inventoryPagination.totalPages) return;
    this.inventoryPagination.page += 1;
    this.loadData();
  }

  prevInventoryPage(): void {
    if (this.inventoryPagination.page <= 1) return;
    this.inventoryPagination.page -= 1;
    this.loadData();
  }

  nextKardexPage(): void {
    if (this.kardexPagination.page >= this.kardexPagination.totalPages) return;
    this.kardexPagination.page += 1;
    this.refreshKardexIfOpen();
  }

  prevKardexPage(): void {
    if (this.kardexPagination.page <= 1) return;
    this.kardexPagination.page -= 1;
    this.refreshKardexIfOpen();
  }

  private persistUiState(): void {
    const state = {
      activeSection: this.activeSection,
      requestFilter: this.requestFilter,
      inventoryStatusFilter: this.inventoryStatusFilter,
      searchTerm: this.searchTerm,
      historySearchTerm: this.historySearchTerm,
      inventorySearchTerm: this.inventorySearchTerm,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private restoreUiState(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (typeof state.activeSection === 'string' && this.allowedSections.has(state.activeSection)) {
        this.activeSection = state.activeSection;
      } else {
        this.activeSection = 'requests';
      }
      if (typeof state.requestFilter === 'string') this.requestFilter = state.requestFilter;
      if (typeof state.inventoryStatusFilter === 'string') this.inventoryStatusFilter = state.inventoryStatusFilter;
      if (typeof state.searchTerm === 'string') this.searchTerm = state.searchTerm;
      if (typeof state.historySearchTerm === 'string') this.historySearchTerm = state.historySearchTerm;
      if (typeof state.inventorySearchTerm === 'string') this.inventorySearchTerm = state.inventorySearchTerm;
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  // Usar disponibilidad REAL del inventario (sin simulaciones)
  isMedicationAvailable(request: MedicationRequest): boolean {
    return request.availableInStock || false;
  }

  async changeRequestStatus(request: MedicationRequest, newStatus: 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled'): Promise<void> {
    this.closeRequestActions();
    // Si es rechazo, abrir modal para razón
    if (newStatus === 'cancelled') {
      this.openRejectModal(request);
      return;
    }
    
    // Verificar disponibilidad REAL del inventario
    const isAvailable = this.isMedicationAvailable(request);
    
    if (!isAvailable && (newStatus === 'in_preparation' || newStatus === 'ready')) {
      const proceed = await this.confirmationService.confirm({
        title: 'Stock no disponible',
        message: `Este medicamento no está disponible en inventario (Stock: ${request.stockAvailable || 0}). ¿Deseas continuar marcándolo como "${newStatus === 'in_preparation' ? 'En Preparación' : 'Listo'}"?`,
        confirmText: 'Continuar',
        cancelText: 'Cancelar',
        type: 'warning',
      });
      if (!proceed) {
        return;
      }
    }

    this.pharmacyService.updateRequestStatus(request.id, newStatus).subscribe({
      next: () => {
        request.status = newStatus;
        
        const statusMessages: { [key: string]: string } = {
          in_preparation: 'Solicitud en preparación',
          ready: 'Solicitud lista para entregar',
          delivered: 'Solicitud marcada como entregada',
        };

        this.notifySuccess(statusMessages[newStatus] || 'Estado actualizado');
        
        // Recargar datos y actualizar contadores
        this.loadRequests();
        this.loadHistory();

        if (newStatus === 'ready') {
          this.notifyInfo('Medicamento listo. Puede entregarse cuando la enfermera lo recoja.');
        }
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        this.notifyError(error.error?.message || 'Error al actualizar el estado');
      }
    });
  }

  openRejectModal(request: MedicationRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (!this.selectedRequest) return;
    
    if (!this.rejectionReason.trim()) {
      this.notifyWarning('Por favor ingresa una razón para rechazar la solicitud');
      return;
    }

    this.pharmacyService.updateRequestStatus(
      this.selectedRequest.id, 
      'cancelled', 
      this.rejectionReason
    ).subscribe({
      next: () => {
        this.notifySuccess('Solicitud rechazada exitosamente');
        this.closeRejectModal();
        this.loadRequests();
        this.loadHistory();
        this.updateCounters();
      },
      error: (error) => {
        console.error('Error rechazando solicitud:', error);
        this.notifyError(error.error?.message || 'Error al rechazar la solicitud');
      }
    });
  }

  /** Partes de `requestedAt` (toLocaleString) para columnas Solicitado por / Fecha-Hora */
  getRequestDatePart(request: MedicationRequest): string {
    const s = request.requestedAt || '';
    const i = s.indexOf(',');
    return i >= 0 ? s.slice(0, i).trim() : s.trim();
  }

  getRequestTimePart(request: MedicationRequest): string {
    const s = request.requestedAt || '';
    const i = s.indexOf(',');
    return i >= 0 ? s.slice(i + 1).trim() : '';
  }

  getHistoryTypeLabel(type: string): string {
    return type === 'delivery' ? 'Entregada' : 'Rechazada';
  }

  getHistoryDate(item: any): string {
    return item.deliveredAt || item.cancelledAt || 'N/A';
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
        this.notifySuccess(`Entrega confirmada. ID: ${response.deliveryId}`);
        
        // Recargar datos para actualizar todo (incluye inventario y kardex en BD)
        this.loadData();
        this.closeDeliveryModal();
      },
      error: (error) => {
        console.error('Error registrando entrega:', error);
        this.notifyError('Error al registrar la entrega');
      }
    });
  }

  viewRequestDetails(request: MedicationRequest): void {
    const patientsInfo = request.patients.map(p => 
      `${p.patientName} (${p.bedNumber}):\n${p.doses.map(d => `  - ${d.time}: ${d.quantity}`).join('\n')}`
    ).join('\n\n');

    this.notifyInfo(`Solicitud ${request.requestId}: ${request.medication} ${request.dosage}, cantidad ${request.quantity}. Pacientes: ${request.patients.length}.`);
  }

  openRequestDetailModal(request: MedicationRequest): void {
    this.closeRequestActions();
    this.selectedRequestDetail = request;
    this.showRequestDetailModal = true;
  }

  closeRequestDetailModal(): void {
    this.showRequestDetailModal = false;
    this.selectedRequestDetail = null;
  }

  openRequestActions(request: MedicationRequest): void {
    this.selectedRequestForActions = request;
  }

  closeRequestActions(): void {
    this.selectedRequestForActions = null;
  }

  requestActionsTitle(r: MedicationRequest): string {
    return `Solicitud ${r.requestId}`;
  }

  requestActionsSummary(r: MedicationRequest): string[] {
    const area =
      r.patients && r.patients.length > 0
        ? r.patients[0].areaName || r.patients[0].area || 'N/A'
        : 'N/A';
    const stock = Number.isFinite(r.stockAvailable as number) ? String(r.stockAvailable) : '0';
    const requested = r.requestedAtRaw ? new Date(r.requestedAtRaw).toLocaleString('es-ES') : r.requestedAt;
    const updated =
      r.statusUpdatedAtRaw && !Number.isNaN(new Date(r.statusUpdatedAtRaw).getTime())
        ? new Date(r.statusUpdatedAtRaw).toLocaleString('es-ES')
        : null;
    const statusLine =
      r.status === 'pending'
        ? 'Pendiente'
        : r.status === 'in_preparation'
          ? 'Aceptada / en preparación'
          : r.status === 'ready'
            ? 'Lista para entrega'
            : r.status === 'delivered'
              ? 'Entregada'
              : 'Rechazada';
    return [
      `Solicitada: ${requested}`,
      updated ? `Último cambio: ${updated} (${statusLine})` : `Estado: ${this.getStatusLabel(r.status)}`,
      `Solicitó: ${r.requestedBy}`,
      `Medicamento: ${r.medication} ${r.dosage}`,
      `Cantidad: ${r.quantity}`,
      `Área: ${area}`,
      `Pacientes: ${(r.patients || []).length}`,
      `Prioridad: ${r.priority}`,
      `Stock: ${stock} ${this.isMedicationAvailable(r) ? '(ok)' : '(revisar)'}`,
    ];
  }

  private normalizeRequestStatus(
    status: MedicationRequest['status'] | string | null | undefined
  ): MedicationRequest['status'] {
    const s = String(status || '').trim();
    if (s === 'pending' || s === 'in_preparation' || s === 'ready' || s === 'delivered' || s === 'cancelled') {
      return s;
    }
    return 'pending';
  }

  canAcceptRequest(r: MedicationRequest): boolean {
    return this.normalizeRequestStatus(r.status) === 'pending';
  }

  canMarkReady(r: MedicationRequest): boolean {
    return this.normalizeRequestStatus(r.status) === 'in_preparation';
  }

  canDeliver(r: MedicationRequest): boolean {
    return this.normalizeRequestStatus(r.status) === 'ready';
  }

  canReject(r: MedicationRequest): boolean {
    const st = this.normalizeRequestStatus(r.status);
    return st !== 'delivered' && st !== 'cancelled';
  }

  openInventoryActions(item: InventoryItem): void {
    this.selectedInventoryForActions = item;
  }

  closeInventoryActions(): void {
    this.selectedInventoryForActions = null;
  }

  inventoryActionsTitle(i: InventoryItem): string {
    return `${i.medication} ${i.dosage}`;
  }

  inventoryActionsSummary(i: InventoryItem): string[] {
    const cad = i.expiryDateRaw ? String(i.expiryDateRaw).slice(0, 10) : '—';
    return [
      `Stock: ${i.stock} (mín: ${i.minStock})`,
      `Ubicación: ${i.location || '—'}`,
      `Caducidad: ${cad}`,
      `Estado: ${this.getInventoryStatusLabel(i)}`,
    ];
  }

  openHistoryActions(item: CombinedHistoryItem): void {
    this.selectedHistoryForActions = item;
  }

  closeHistoryActions(): void {
    this.selectedHistoryForActions = null;
  }

  historyActionsTitle(i: CombinedHistoryItem): string {
    return `${i.type === 'delivery' ? 'Entrega' : 'Rechazo'} ${i.deliveryId || i.requestId || ''}`;
  }

  historyActionsSummary(i: CombinedHistoryItem): string[] {
    const when = this.getHistoryDate(i);
    const requestedAt =
      i.requestedAt && !Number.isNaN(new Date(i.requestedAt).getTime())
        ? new Date(i.requestedAt).toLocaleString('es-ES')
        : null;
    const who = i.requestedBy || '—';
    const detail = i.type === 'delivery' ? (i.deliveredBy || '—') : (i.notes || '—');
    return [
      requestedAt ? `Solicitada: ${requestedAt}` : null,
      `Fecha: ${when}`,
      `Medicamento: ${i.medication} ${i.dosage}`,
      `Cantidad: ${i.quantity}`,
      `Solicitado por: ${who}`,
      i.type === 'delivery' ? `Entregado por: ${detail}` : `Razón: ${detail}`,
    ].filter(Boolean) as string[];
  }

  updateStock(item: InventoryItem): void {
    this.openStockMovementModal(item, 'adjustment');
  }

  /** Base para nombre de archivo: incluye fecha y hora de creación del export. */
  private buildExportFilename(base: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${base}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  private triggerDownload(content: string, filename: string, mime: string): void {
    const blob = new Blob(['\ufeff' + content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvCell(value: string | number | null | undefined): string {
    const s = String(value ?? '');
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private escapeHtml(value: string | number | null | undefined): string {
    const s = String(value ?? '');
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private printRowsAsTable(title: string, headers: string[], rows: Array<Array<string | number>>): void {
    if (!rows.length) {
      this.notifyWarning('No hay datos para imprimir con los filtros actuales.');
      return;
    }
    const now = new Date().toLocaleString('es-ES');
    const thead = `<tr>${headers.map((h) => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr>`;
    const tbody = rows
      .map((r) => `<tr>${r.map((c) => `<td>${this.escapeHtml(c)}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 16px; color: #1a202c; }
      h1 { margin: 0 0 6px; font-size: 18px; }
      p { margin: 0 0 12px; color: #4a5568; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e0; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #edf2f7; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>${this.escapeHtml(title)}</h1>
    <p>Generado: ${this.escapeHtml(now)}</p>
    <table>
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
    <script>window.onload = () => { window.print(); };</script>
  </body>
</html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      this.notifyError('No se pudo abrir la vista de impresión.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  private formatHistoryPatients(item: DeliveryHistoryItem): string {
    if (item.patients?.length) {
      return item.patients.join('; ');
    }
    if (item.patientsInfo?.length) {
      return item.patientsInfo.map((p) => `${p.patientName} (${p.bedNumber})`).join('; ');
    }
    return '';
  }

  private historyDeliveredOrReason(item: DeliveryHistoryItem): string {
    if (item.type === 'delivery') {
      return item.deliveredBy || '';
    }
    return (item.notes || '').replace(/\n/g, ' ');
  }

  exportHistoryCsv(): void {
    if (!this.filteredHistory.length) {
      this.notifyWarning('No hay registros en el historial para exportar.');
      return;
    }
    const headers = [
      'Tipo',
      'ID',
      'Fecha',
      'Medicamento',
      'Dosis',
      'Cantidad',
      'Solicitado por',
      'Pacientes',
      'Entregado por / Motivo',
      'Notas',
    ];
    const lines = [headers.join(',')];
    for (const item of this.filteredHistory) {
      const tipo = item.type === 'delivery' ? 'Entrega' : 'Rechazo';
      const id = item.deliveryId || item.requestId || '';
      const row = [
        this.escapeCsvCell(tipo),
        this.escapeCsvCell(id),
        this.escapeCsvCell(this.getHistoryDate(item)),
        this.escapeCsvCell(item.medication),
        this.escapeCsvCell(item.dosage),
        this.escapeCsvCell(item.quantity),
        this.escapeCsvCell(item.requestedBy),
        this.escapeCsvCell(this.formatHistoryPatients(item)),
        this.escapeCsvCell(this.historyDeliveredOrReason(item)),
        this.escapeCsvCell(item.type === 'delivery' ? item.notes || '' : ''),
      ];
      lines.push(row.join(','));
    }
    this.triggerDownload(lines.join('\n'), `${this.buildExportFilename('historial_farmacia')}.csv`, 'text/csv');
    this.notifySuccess('Historial exportado a CSV');
  }

  async exportHistoryExcel(): Promise<void> {
    if (!this.filteredHistory.length) {
      this.notifyWarning('No hay registros en el historial para exportar.');
      return;
    }
    const rows = this.filteredHistory.map((item) => ({
      Tipo: item.type === 'delivery' ? 'Entrega' : 'Rechazo',
      ID: item.deliveryId || item.requestId || '',
      Fecha: this.getHistoryDate(item),
      Medicamento: item.medication,
      Dosis: item.dosage,
      Cantidad: item.quantity,
      'Solicitado por': item.requestedBy,
      Pacientes: this.formatHistoryPatients(item),
      'Entregado por / Motivo': this.historyDeliveredOrReason(item),
      Notas: item.type === 'delivery' ? item.notes || '' : '',
    }));
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `${this.buildExportFilename('historial_farmacia')}.xlsx`);
    this.notifySuccess('Historial exportado a Excel');
  }

  printHistory(): void {
    const headers = ['Tipo', 'ID', 'Fecha', 'Medicamento', 'Dosis', 'Cantidad', 'Solicitado por'];
    const rows = this.filteredHistory.map((item) => [
      item.type === 'delivery' ? 'Entrega' : 'Rechazo',
      item.deliveryId || item.requestId || '',
      this.getHistoryDate(item),
      item.medication,
      item.dosage,
      item.quantity,
      item.requestedBy,
    ]);
    this.printRowsAsTable('Historial de farmacia', headers, rows);
  }

  exportInventoryCsv(): void {
    if (!this.filteredInventory.length) {
      this.notifyWarning('No hay filas de inventario para exportar (revisa filtros).');
      return;
    }
    const headers = [
      'Medicamento',
      'Dosis',
      'Descripcion',
      'Stock actual',
      'Stock minimo',
      'Ubicacion',
      'Caducidad',
      'Estado',
      'Clasificacion caducidad',
      'Dias a caducidad',
    ];
    const lines = [headers.join(',')];
    for (const item of this.filteredInventory) {
      const cad = item.expiryDateRaw ? String(item.expiryDateRaw).slice(0, 10) : '';
      const row = [
        this.escapeCsvCell(item.medication),
        this.escapeCsvCell(item.dosage),
        this.escapeCsvCell(item.description || ''),
        this.escapeCsvCell(item.stock),
        this.escapeCsvCell(item.minStock),
        this.escapeCsvCell(item.location),
        this.escapeCsvCell(cad),
        this.escapeCsvCell(this.getInventoryStatusLabel(item)),
        this.escapeCsvCell(item.expiryClassification),
        this.escapeCsvCell(item.daysToExpiry ?? ''),
      ];
      lines.push(row.join(','));
    }
    this.triggerDownload(lines.join('\n'), `${this.buildExportFilename('bodega_inventario')}.csv`, 'text/csv');
    this.notifySuccess('Inventario de bodega exportado a CSV');
  }

  async exportInventoryExcel(): Promise<void> {
    if (!this.filteredInventory.length) {
      this.notifyWarning('No hay filas de inventario para exportar (revisa filtros).');
      return;
    }
    const rows = this.filteredInventory.map((item) => ({
      Medicamento: item.medication,
      Dosis: item.dosage,
      Descripcion: item.description || '',
      'Stock actual': item.stock,
      'Stock mínimo': item.minStock,
      Ubicación: item.location,
      Caducidad: item.expiryDateRaw ? String(item.expiryDateRaw).slice(0, 10) : '',
      Estado: this.getInventoryStatusLabel(item),
      'Clasificación caducidad': item.expiryClassification,
      'Días a caducidad': item.daysToExpiry ?? '',
    }));
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bodega');
    XLSX.writeFile(wb, `${this.buildExportFilename('bodega_inventario')}.xlsx`);
    this.notifySuccess('Inventario de bodega exportado a Excel');
  }

  printInventory(): void {
    const headers = ['Medicamento', 'Dosis', 'Stock actual', 'Stock mínimo', 'Ubicación', 'Caducidad', 'Estado'];
    const rows = this.filteredInventory.map((item) => [
      item.medication,
      item.dosage,
      item.stock,
      item.minStock,
      item.location,
      item.expiryDateRaw ? String(item.expiryDateRaw).slice(0, 10) : '',
      this.getInventoryStatusLabel(item),
    ]);
    this.printRowsAsTable('Inventario de farmacia', headers, rows);
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      in_preparation: 'Preparando',
      ready: 'Lista',
      delivered: 'Entregada',
    };
    return labels[status] || status;
  }

  getInventoryStatusLabel(item: InventoryItem): string {
    if (item.expiryClassification === 'expired') {
      return 'Vencido (caducidad)';
    }
    if (item.expiryClassification === 'expiring_soon') {
      const d = item.daysToExpiry;
      const w = item.expiringSoonDays;
      return d != null
        ? `Por caducar (${d} días · ventana ${w}d)`
        : `Por caducar (ventana ${w}d)`;
    }
    const labels: Record<string, string> = {
      available: 'Disponible',
      low_stock: 'Stock bajo',
      expired: 'Vencido',
      out_of_stock: 'Sin stock',
    };
    return labels[item.status] || item.status;
  }

  expiringSoonWindowLabel(): number {
    return this.inventory[0]?.expiringSoonDays ?? 30;
  }

  getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      exit: 'Salida',
      adjustment: 'Ajuste',
      delivery: 'Entrega (solicitud)',
    };
    return labels[type] || type;
  }

  openKardexModal(item: InventoryItem): void {
    if (!item.id) {
      this.notifyError('No se pudo identificar el medicamento');
      return;
    }
    this.kardexItem = item;
    this.showKardexModal = true;
    this.kardexMovements = [];
    this.kardexPagination.page = 1;
    this.refreshKardexIfOpen();
  }

  closeKardexModal(): void {
    this.showKardexModal = false;
    this.kardexItem = null;
    this.kardexMovements = [];
    this.kardexLoading = false;
  }

  private refreshKardexIfOpen(): void {
    if (!this.showKardexModal || !this.kardexItem?.id) {
      return;
    }
    const id = this.kardexItem.id;
    this.kardexLoading = true;
    this.loadingKardex = true;
    this.kardexError = '';
    this.pharmacyService
      .getInventoryMovementsPaged(id, this.kardexPagination.page, this.kardexPagination.limit)
      .subscribe({
        next: (result) => {
          this.kardexMovements = result.data;
          this.kardexPagination = result.pagination;
          this.kardexLoading = false;
          this.loadingKardex = false;
        },
        error: (err) => {
          this.kardexLoading = false;
          this.loadingKardex = false;
          this.kardexError = err?.error?.message || 'No se pudo cargar el kardex';
        },
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ========== GESTIÓN DE INVENTARIO ==========

  openAddMedicationModal(): void {
    this.newMedicationForm = {
      name: '',
      dosage: '',
      description: '',
      stock: 0,
      minStock: 50,
      location: '',
      expiryDate: ''
    };
    this.showAddMedicationModal = true;
  }

  closeAddMedicationModal(): void {
    this.showAddMedicationModal = false;
    this.newMedicationForm = {
      name: '',
      dosage: '',
      description: '',
      stock: 0,
      minStock: 50,
      location: '',
      expiryDate: ''
    };
  }

  createMedication(): void {
    if (!this.newMedicationForm.name || !this.newMedicationForm.dosage) {
      this.notifyWarning('El nombre y la dosis son requeridos');
      return;
    }

    if (this.newMedicationForm.stock < 0) {
      this.notifyWarning('El stock no puede ser negativo');
      return;
    }

    this.pharmacyService.createMedication(this.newMedicationForm).subscribe({
      next: () => {
        this.notifySuccess('Medicamento agregado al inventario exitosamente');
        this.closeAddMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error creando medicamento:', error);
        this.notifyError(error.error?.message || 'Error al crear el medicamento');
      }
    });
  }

  openDeleteMedicationModal(item: InventoryItem): void {
    this.selectedMedicationForDelete = item;
    this.showDeleteMedicationModal = true;
  }

  closeDeleteMedicationModal(): void {
    this.showDeleteMedicationModal = false;
    this.selectedMedicationForDelete = null;
  }

  async confirmDeleteMedication(): Promise<void> {
    if (!this.selectedMedicationForDelete?.id) {
      this.notifyError('No se pudo identificar el medicamento');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Eliminar medicamento',
      message: `¿Estás seguro de eliminar "${this.selectedMedicationForDelete.medication} ${this.selectedMedicationForDelete.dosage}" del inventario? Esta acción lo marcará como inactivo.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.pharmacyService.deleteMedication(this.selectedMedicationForDelete.id).subscribe({
      next: () => {
        this.notifySuccess('Medicamento eliminado del inventario exitosamente');
        this.closeDeleteMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error eliminando medicamento:', error);
        this.notifyError(error.error?.message || 'Error al eliminar el medicamento');
      }
    });
  }

  openStockMovementModal(item: InventoryItem, type: 'entry' | 'exit' | 'adjustment'): void {
    if (!item.id) {
      this.notifyError('No se pudo identificar el medicamento');
      return;
    }
    this.selectedInventoryItem = item;
    this.stockMovementForm = {
      type,
      quantity: 0,
      reason: '',
      entryExpiryDate: '',
    };
    this.showStockMovementModal = true;
  }

  closeStockMovementModal(): void {
    this.showStockMovementModal = false;
    this.selectedInventoryItem = null;
    this.stockMovementForm = {
      type: 'adjustment',
      quantity: 0,
      reason: '',
      entryExpiryDate: '',
    };
  }

  applyStockMovement(): void {
    if (!this.selectedInventoryItem?.id) {
      this.notifyError('No se encontró el medicamento seleccionado');
      return;
    }

    const qty = Number(this.stockMovementForm.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      this.notifyWarning('Cantidad inválida');
      return;
    }

    let newStock = this.selectedInventoryItem.stock;
    if (this.stockMovementForm.type === 'entry') newStock += qty;
    if (this.stockMovementForm.type === 'exit') newStock -= qty;
    if (this.stockMovementForm.type === 'adjustment') newStock = qty;

    if (newStock < 0) {
      this.notifyWarning('No puedes dejar stock negativo');
      return;
    }

    const payload: {
      type: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      reason?: string;
      expiryDate?: string;
    } = {
      type: this.stockMovementForm.type,
      quantity: qty,
      reason: this.stockMovementForm.reason?.trim() || undefined,
    };
    if (this.stockMovementForm.type === 'entry' && this.stockMovementForm.entryExpiryDate?.trim()) {
      payload.expiryDate = this.stockMovementForm.entryExpiryDate.trim().slice(0, 10);
    }

    this.pharmacyService
      .postInventoryMovement(this.selectedInventoryItem.id, payload)
      .subscribe({
        next: () => {
          this.notifySuccess('Movimiento de inventario aplicado');
          this.closeStockMovementModal();
          this.loadData();
          this.refreshKardexIfOpen();
        },
        error: (error) => {
          console.error('Error aplicando movimiento:', error);
          this.notifyError(error.error?.message || 'Error al aplicar movimiento de inventario');
        },
      });
  }

  get totalInventoryItems(): number {
    return this.inventory.length;
  }

  get lowStockItems(): number {
    return this.inventory.filter(i => i.status === 'low_stock').length;
  }

  get outOfStockItems(): number {
    return this.inventory.filter(i => i.status === 'out_of_stock').length;
  }

  get expiredItems(): number {
    return this.inventory.filter((i) => i.expiryClassification === 'expired').length;
  }

  get expiringSoonItems(): number {
    return this.inventory.filter((i) => i.expiryClassification === 'expiring_soon').length;
  }
}
