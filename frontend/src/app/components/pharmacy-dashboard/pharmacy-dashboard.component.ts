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
import { ExportService } from '../../shared/services/export.service';
import { BootstrapIconComponent } from '../../shared/components/bootstrap-icon/bootstrap-icon.component';

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
    BootstrapIconComponent,
  ],
  templateUrl: './pharmacy-dashboard.component.html',
  styleUrls: [
    '../../shared/styles/admin-table-unified.css',
    './pharmacy-dashboard.component.css',
  ],
})
export class PharmacyDashboardComponent implements OnInit {
  pharmacyUserName: string = $localize`:@@pharmacyModule.defaultPharmacyUserName:Farmacia Central`;

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

  readonly pharmacyShellPanelTitle = $localize`:@@pharmacyShell.panelTitle:Panel de Farmacia`;
  readonly pharmacyShellRoleLabel = $localize`:@@pharmacyShell.roleLabel:Farmacia`;
  readonly pharmacyShellNavAriaLabel = $localize`:@@pharmacyShell.navAria:Módulos de farmacia`;
  readonly pharmacyShellLogoSectionAriaLabel = $localize`:@@pharmacyShell.logoSectionAria:Ir al módulo de solicitudes`;
  readonly pharmacyShellTabRequestsLabel = $localize`:@@pharmacyShell.tabRequests:📋 Solicitudes`;
  readonly pharmacyShellTabHistoryLabel = $localize`:@@pharmacyShell.tabHistory:📦 Historial`;
  readonly pharmacyShellTabInventoryLabel = $localize`:@@pharmacyShell.tabInventory:🗃️ Inventario`;
  readonly pharmacyShellTabAttendanceLabel = $localize`:@@pharmacyShell.tabAttendance:✅ Asistencia`;
  readonly pharmacyShellTabAttendanceTitle = $localize`:@@pharmacyShell.tabAttendanceTitle:Abrir asistencia de farmacia`;

  readonly pharmacyRequestsSectionTitle = $localize`:@@pharmacyModule.requestsTitle:Solicitudes de Medicamentos`;
  readonly pharmacyRequestsSearchPlaceholder = $localize`:@@pharmacyModule.requestsSearchPlaceholder:Buscar medicamento o enfermera...`;
  readonly pharmacyRequestsLoading = $localize`:@@pharmacyModule.requestsLoading:Cargando solicitudes...`;
  readonly pharmacyRequestsKpisAria = $localize`:@@pharmacyModule.requestsKpisAria:Resumen del flujo de solicitudes`;
  readonly pharmacyRequestsKpisTitle = $localize`:@@pharmacyModule.requestsKpisTitle:Estado del día`;
  readonly pharmacyKpiPending = $localize`:@@pharmacyModule.kpiPending:Pendientes`;
  readonly pharmacyKpiInPrep = $localize`:@@pharmacyModule.kpiInPrep:En preparación`;
  readonly pharmacyKpiReady = $localize`:@@pharmacyModule.kpiReady:Listas para entregar`;
  readonly pharmacyKpiDeliveredToday = $localize`:@@pharmacyModule.kpiDeliveredToday:Entregadas hoy`;
  readonly pharmacyKpiDeliveredTodayTitle = $localize`:@@pharmacyModule.kpiDeliveredTodayTitle:Ver historial de entregas`;
  readonly pharmacyThMedication = $localize`:@@pharmacyModule.thMedication:Medicamento`;
  readonly pharmacyThNurse = $localize`:@@pharmacyModule.thNurse:Enfermera`;
  readonly pharmacyThQuantity = $localize`:@@pharmacyModule.thQuantity:Cantidad`;
  readonly pharmacyThArea = $localize`:@@pharmacyModule.thArea:Área`;
  readonly pharmacyRequestFilterOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'all', label: $localize`:@@pharmacyModule.filterAll:Todas` },
    { value: 'pending', label: $localize`:@@pharmacyModule.filterPending:Pendientes` },
    { value: 'in_preparation', label: $localize`:@@pharmacyModule.filterInPrep:En Preparación` },
    { value: 'ready', label: $localize`:@@pharmacyModule.filterReady:Listas` },
    { value: 'delivered', label: $localize`:@@pharmacyModule.filterDelivered:Entregadas` },
    { value: 'cancelled', label: $localize`:@@pharmacyModule.filterCancelled:Rechazadas` },
  ];

  readonly pharmacyHistorySectionTitle = $localize`:@@pharmacyModule.historyTitle:Historial de Entregas y Rechazos`;
  readonly pharmacyHistorySearchPlaceholder = $localize`:@@pharmacyModule.historySearchPlaceholder:Buscar en historial...`;
  readonly pharmacyHistoryLoading = $localize`:@@pharmacyModule.historyLoading:Cargando historial...`;

  readonly pharmacyInventorySectionTitle = $localize`:@@pharmacyModule.inventoryTitle:Gestión de Inventario`;
  readonly pharmacyInventorySearchPlaceholder = $localize`:@@pharmacyModule.inventorySearchPlaceholder:Medicamento, ubicación o fecha de caducidad (AAAA-MM-DD)…`;
  readonly pharmacyAddMedication = $localize`:@@pharmacyModule.addMedication:Agregar Medicamento`;

  readonly pharmacyValueNotAvailable = $localize`:@@pharmacyModule.valueNotAvailable:N/A`;
  readonly pharmacyRequestedByRoleNurse = $localize`:@@pharmacyModule.requestedByRoleNurse:(Enfermera)`;
  readonly pharmacyHistoryNotesWhenEmpty = $localize`:@@pharmacyModule.historyNotesWhenEmpty:Sin observaciones`;

  readonly pharmacyRequestsEmptyMessage = $localize`:@@pharmacyModule.requestsEmpty:No hay solicitudes que coincidan con los filtros seleccionados`;
  readonly pharmacyHistoryEmptyMessage = $localize`:@@pharmacyModule.historyEmpty:No hay registros en el historial`;
  readonly pharmacyInventoryEmptyMessage = $localize`:@@pharmacyModule.inventoryEmpty:No hay medicamentos en inventario`;
  readonly pharmacyInventoryLoading = $localize`:@@pharmacyModule.inventoryLoading:Cargando inventario...`;

  readonly pharmacyPaginationPrev = $localize`:@@pharmacyModule.paginationPrev:← Anterior`;
  readonly pharmacyPaginationNext = $localize`:@@pharmacyModule.paginationNext:Siguiente →`;

  readonly pharmacyExportHistoryAria = $localize`:@@pharmacyModule.exportHistoryAria:Exportar historial`;
  readonly pharmacyExportHistoryTitle = $localize`:@@pharmacyModule.exportHistoryTitle:Exportar historial`;
  readonly pharmacyExportHistoryHint = $localize`:@@pharmacyModule.exportHistoryHint:Se exportan los registros visibles con el buscador actual. El nombre del archivo incluye la fecha y hora en que se genera.`;
  readonly pharmacyExportPdf = $localize`:@@pharmacyModule.exportPdf:PDF`;
  readonly pharmacyExportSaveCsv = $localize`:@@pharmacyModule.exportSaveCsv:Guardar CSV`;

  readonly pharmacyExportInventoryAria = $localize`:@@pharmacyModule.exportInventoryAria:Exportar inventario de bodega`;
  readonly pharmacyExportInventoryTitle = $localize`:@@pharmacyModule.exportInventoryTitle:Exportar bodega / stock`;
  readonly pharmacyExportInventoryHint = $localize`:@@pharmacyModule.exportInventoryHint:Incluye medicamento, dosis, stock, mínimos, ubicación, caducidad y estado. Respeta filtros y búsqueda actuales. El archivo lleva fecha y hora de generación en el nombre.`;

  readonly pharmacyThHistoryType = $localize`:@@pharmacyModule.thHistoryType:Tipo`;
  readonly pharmacyThHistoryDateTime = $localize`:@@pharmacyModule.thHistoryDateTime:Fecha/Hora`;
  readonly pharmacyThHistoryQuantity = $localize`:@@pharmacyModule.thHistoryQuantity:Cantidad`;
  readonly pharmacyThHistoryRequestedBy = $localize`:@@pharmacyModule.thHistoryRequestedBy:Solicitado por`;

  readonly pharmacyStatTotalMedications = $localize`:@@pharmacyModule.statTotalMedications:Medicamentos`;
  readonly pharmacyStatLowStock = $localize`:@@pharmacyModule.statLowStock:Stock Bajo`;
  readonly pharmacyStatOutOfStock = $localize`:@@pharmacyModule.statOutOfStock:Sin Stock`;
  readonly pharmacyChipAll = $localize`:@@pharmacyModule.chipAll:Todos`;
  readonly pharmacyChipAvailable = $localize`:@@pharmacyModule.chipAvailable:Disponibles`;
  readonly pharmacyChipLowStock = $localize`:@@pharmacyModule.chipLowStock:Stock bajo`;
  readonly pharmacyChipOutOfStock = $localize`:@@pharmacyModule.chipOutOfStock:Sin stock`;
  readonly pharmacyChipExpired = $localize`:@@pharmacyModule.chipExpired:Vencidos`;

  readonly pharmacyThInvMedication = $localize`:@@pharmacyModule.thInvMedication:Medicamento`;
  readonly pharmacyThInvDosage = $localize`:@@pharmacyModule.thInvDosage:Dosis`;
  readonly pharmacyThInvStockCurrent = $localize`:@@pharmacyModule.thInvStockCurrent:Stock Actual`;
  readonly pharmacyThInvStockMin = $localize`:@@pharmacyModule.thInvStockMin:Stock Mínimo`;
  readonly pharmacyThInvLocation = $localize`:@@pharmacyModule.thInvLocation:Ubicación`;
  readonly pharmacyThInvExpiry = $localize`:@@pharmacyModule.thInvExpiry:Fecha de Vencimiento`;
  readonly pharmacyThInvStatus = $localize`:@@pharmacyModule.thInvStatus:Estado`;

  readonly pharmacyKardexLoading = $localize`:@@pharmacyModule.kardexLoading:Cargando historial…`;
  readonly pharmacyKardexEmptyMovements = $localize`:@@pharmacyModule.kardexEmptyMovements:No hay movimientos registrados para este medicamento.`;
  readonly pharmacyThKardexDate = $localize`:@@pharmacyModule.thKardexDate:Fecha`;
  readonly pharmacyThKardexType = $localize`:@@pharmacyModule.thKardexType:Tipo`;
  readonly pharmacyThKardexDelta = $localize`:@@pharmacyModule.thKardexDelta:Δ`;
  readonly pharmacyThKardexBefore = $localize`:@@pharmacyModule.thKardexBefore:Antes`;
  readonly pharmacyThKardexAfter = $localize`:@@pharmacyModule.thKardexAfter:Después`;
  readonly pharmacyThKardexUser = $localize`:@@pharmacyModule.thKardexUser:Usuario`;
  readonly pharmacyThKardexReason = $localize`:@@pharmacyModule.thKardexReason:Motivo`;

  readonly pharmacyEmDash = $localize`:@@pharmacyModule.emDash:—`;
  readonly pharmacyBedNone = $localize`:@@pharmacyModule.bedNone:Sin cama`;

  readonly pharmacyActionViewDetail = $localize`:@@pharmacyModule.actionViewDetail:Ver detalle`;
  readonly pharmacyActionAcceptPrep = $localize`:@@pharmacyModule.actionAcceptPrep:Aceptar (en preparación)`;
  readonly pharmacyActionMarkReady = $localize`:@@pharmacyModule.actionMarkReady:Marcar como lista`;
  readonly pharmacyActionDeliver = $localize`:@@pharmacyModule.actionDeliver:Entregar`;
  readonly pharmacyActionReject = $localize`:@@pharmacyModule.actionReject:Rechazar`;

  readonly pharmacyModalClose = $localize`:@@pharmacyModule.modalClose:Cerrar`;
  readonly pharmacyModalCancel = $localize`:@@pharmacyModule.modalCancel:Cancelar`;

  readonly pharmacyLblId = $localize`:@@pharmacyModule.lblId:ID:`;
  readonly pharmacyLblMedication = $localize`:@@pharmacyModule.lblMedication:Medicamento:`;
  readonly pharmacyLblRequestedBy = $localize`:@@pharmacyModule.lblRequestedBy:Solicitada por:`;
  readonly pharmacyLblQuantity = $localize`:@@pharmacyModule.lblQuantity:Cantidad:`;
  readonly pharmacyLblStatus = $localize`:@@pharmacyModule.lblStatus:Estado:`;
  readonly pharmacyLblPriority = $localize`:@@pharmacyModule.lblPriority:Prioridad:`;
  readonly pharmacyLblRequestTime = $localize`:@@pharmacyModule.lblRequestTime:Solicitud:`;
  readonly pharmacyLblLastChange = $localize`:@@pharmacyModule.lblLastChange:Último cambio:`;
  readonly pharmacyLblStock = $localize`:@@pharmacyModule.lblStock:Stock:`;
  readonly pharmacyLblRequestId = $localize`:@@pharmacyModule.lblRequestId:ID Solicitud:`;

  readonly pharmacyPatientsHeading = $localize`:@@pharmacyModule.patientsHeading:Pacientes`;
  readonly pharmacyPatientsDeliveryHeading = $localize`:@@pharmacyModule.patientsDeliveryHeading:Pacientes que recibirán este medicamento:`;

  readonly pharmacyDeliveryTitle = $localize`:@@pharmacyModule.deliveryTitle:Confirmar Entrega`;
  readonly pharmacyDeliveryNotesLabel = $localize`:@@pharmacyModule.deliveryNotesLabel:Notas de Entrega`;
  readonly pharmacyDeliveryNotesPlaceholder = $localize`:@@pharmacyModule.deliveryNotesPlaceholder:Observaciones sobre la entrega...`;
  readonly pharmacyDeliveryConfirmBtn = $localize`:@@pharmacyModule.deliveryConfirmBtn:Confirmar Entrega`;

  readonly pharmacyRejectTitle = $localize`:@@pharmacyModule.rejectTitle:Rechazar Solicitud`;
  readonly pharmacyRejectReasonLabel = $localize`:@@pharmacyModule.rejectReasonLabel:Razón del Rechazo *`;
  readonly pharmacyRejectReasonPlaceholder = $localize`:@@pharmacyModule.rejectReasonPlaceholder:Ej: Medicamento no disponible en inventario, requiere autorización especial, etc.`;
  readonly pharmacyRejectReasonHint = $localize`:@@pharmacyModule.rejectReasonHint:Es obligatorio proporcionar una razón para rechazar la solicitud`;
  readonly pharmacyRejectConfirmBtn = $localize`:@@pharmacyModule.rejectConfirmBtn:Confirmar Rechazo`;

  readonly pharmacyAddMedModalTitle = $localize`:@@pharmacyModule.addMedModalTitle:Agregar Medicamento al Inventario`;
  readonly pharmacyAddMedNameLabel = $localize`:@@pharmacyModule.addMedNameLabel:Nombre del Medicamento *`;
  readonly pharmacyAddMedNamePlaceholder = $localize`:@@pharmacyModule.addMedNamePlaceholder:Ej: Paracetamol, Ibuprofeno, etc.`;
  readonly pharmacyAddMedDosageLabel = $localize`:@@pharmacyModule.addMedDosageLabel:Dosis *`;
  readonly pharmacyAddMedDosagePlaceholder = $localize`:@@pharmacyModule.addMedDosagePlaceholder:Ej: 500mg, 10ml, etc.`;
  readonly pharmacyAddMedDescLabel = $localize`:@@pharmacyModule.addMedDescLabel:Descripción`;
  readonly pharmacyAddMedDescPlaceholder = $localize`:@@pharmacyModule.addMedDescPlaceholder:Descripción del medicamento...`;
  readonly pharmacyAddMedStockInitLabel = $localize`:@@pharmacyModule.addMedStockInitLabel:Stock Inicial`;
  readonly pharmacyAddMedStockMinLabel = $localize`:@@pharmacyModule.addMedStockMinLabel:Stock Mínimo`;
  readonly pharmacyAddMedLocationLabel = $localize`:@@pharmacyModule.addMedLocationLabel:Ubicación`;
  readonly pharmacyAddMedLocationPlaceholder = $localize`:@@pharmacyModule.addMedLocationPlaceholder:Ej: Estante A-1, Refrigerador, etc.`;
  readonly pharmacyAddMedExpiryLabel = $localize`:@@pharmacyModule.addMedExpiryLabel:Fecha de Vencimiento`;
  readonly pharmacyAddMedSubmitBtn = $localize`:@@pharmacyModule.addMedSubmitBtn:Agregar al Inventario`;

  readonly pharmacyDeleteMedModalTitle = $localize`:@@pharmacyModule.deleteMedModalTitle:Eliminar Medicamento del Inventario`;
  readonly pharmacyDeleteMedWarning = $localize`:@@pharmacyModule.deleteMedWarning:Esta acción marcará el medicamento como inactivo en el inventario. No se eliminará físicamente de la base de datos, pero dejará de aparecer en las listas activas.`;
  readonly pharmacyDeleteMedConfirmBtn = $localize`:@@pharmacyModule.deleteMedConfirmBtn:Confirmar Eliminación`;

  readonly pharmacyStockMoveTitle = $localize`:@@pharmacyModule.stockMoveTitle:Movimiento de Inventario`;
  readonly pharmacyStockMoveTypeLabel = $localize`:@@pharmacyModule.stockMoveTypeLabel:Tipo de movimiento`;
  readonly pharmacyStockMoveOptEntry = $localize`:@@pharmacyModule.stockMoveOptEntry:Entrada (+)`;
  readonly pharmacyStockMoveOptExit = $localize`:@@pharmacyModule.stockMoveOptExit:Salida (-)`;
  readonly pharmacyStockMoveOptAdjustment = $localize`:@@pharmacyModule.stockMoveOptAdjustment:Ajuste (valor final)`;
  readonly pharmacyStockMoveQtyFinalLabel = $localize`:@@pharmacyModule.stockMoveQtyFinalLabel:Stock final`;
  readonly pharmacyStockMoveQtyLabel = $localize`:@@pharmacyModule.stockMoveQtyLabel:Cantidad`;
  readonly pharmacyStockMoveEntryExpiryLabel = $localize`:@@pharmacyModule.stockMoveEntryExpiryLabel:Caducidad del lote (opcional)`;
  readonly pharmacyStockMoveEntryExpiryHint = $localize`:@@pharmacyModule.stockMoveEntryExpiryHint:Actualiza la fecha de caducidad del artículo en inventario. Varias fechas por lote requerirán una tabla de lotes en backend.`;
  readonly pharmacyStockMoveReasonLabel = $localize`:@@pharmacyModule.stockMoveReasonLabel:Motivo (opcional)`;
  readonly pharmacyStockMoveReasonPlaceholder = $localize`:@@pharmacyModule.stockMoveReasonPlaceholder:Compra, consumo, merma, ajuste físico, etc.`;
  readonly pharmacyStockMoveSaveBtn = $localize`:@@pharmacyModule.stockMoveSaveBtn:Guardar movimiento`;

  readonly pharmacyLblStockCurrent = $localize`:@@pharmacyModule.lblStockCurrent:Stock Actual:`;
  readonly pharmacyLblLocation = $localize`:@@pharmacyModule.lblLocation:Ubicación:`;

  readonly pharmacyInventoryActionEntry = $localize`:@@pharmacyModule.invActionEntry:Entrada`;
  readonly pharmacyInventoryActionExit = $localize`:@@pharmacyModule.invActionExit:Salida`;
  readonly pharmacyInventoryActionAdjust = $localize`:@@pharmacyModule.invActionAdjust:Ajuste`;
  readonly pharmacyInventoryActionKardex = $localize`:@@pharmacyModule.invActionKardex:Kardex`;
  readonly pharmacyInventoryActionDelete = $localize`:@@pharmacyModule.invActionDelete:Eliminar`;

  readonly pharmacyKardexModalTitlePrefix = $localize`:@@pharmacyModule.kardexModalTitlePrefix:Kardex —`;

  readonly pharmacyErrMedicationId = $localize`:@@pharmacyModule.errMedicationId:No se pudo identificar el medicamento`;
  readonly pharmacyErrKardexLoad = $localize`:@@pharmacyModule.errKardexLoad:No se pudo cargar el kardex`;
  readonly pharmacyErrLoadInventory = $localize`:@@pharmacyModule.errLoadInventory:No se pudo cargar el inventario`;
  readonly pharmacyErrLoadRequests = $localize`:@@pharmacyModule.errLoadRequests:No se pudieron cargar las solicitudes`;
  readonly pharmacyErrLoadRequestsToast = $localize`:@@pharmacyModule.errLoadRequestsToast:Error al cargar las solicitudes. Por favor, recarga la página.`;
  readonly pharmacyErrLoadHistory = $localize`:@@pharmacyModule.errLoadHistory:No se pudo cargar el historial`;
  readonly pharmacyWarnAddMedNameDosage = $localize`:@@pharmacyModule.warnAddMedNameDosage:El nombre y la dosis son requeridos`;
  readonly pharmacyWarnAddMedStockNegative = $localize`:@@pharmacyModule.warnAddMedStockNegative:El stock no puede ser negativo`;
  readonly pharmacyToastAddMedOk = $localize`:@@pharmacyModule.toastAddMedOk:Medicamento agregado al inventario exitosamente`;
  readonly pharmacyErrCreateMedication = $localize`:@@pharmacyModule.errCreateMedication:Error al crear el medicamento`;
  readonly pharmacyConfirmDeleteMedTitle = $localize`:@@pharmacyModule.confirmDeleteMedTitle:Eliminar medicamento`;
  readonly pharmacyConfirmDeleteMedConfirm = $localize`:@@pharmacyModule.confirmDeleteMedConfirm:Eliminar`;
  readonly pharmacyConfirmDeleteMedCancel = $localize`:@@pharmacyModule.confirmDeleteMedCancel:Cancelar`;
  readonly pharmacyToastDeleteMedOk = $localize`:@@pharmacyModule.toastDeleteMedOk:Medicamento eliminado del inventario exitosamente`;
  readonly pharmacyErrDeleteMedication = $localize`:@@pharmacyModule.errDeleteMedication:Error al eliminar el medicamento`;
  readonly pharmacyErrStockMoveMedNotFound = $localize`:@@pharmacyModule.errStockMoveMedNotFound:No se encontró el medicamento seleccionado`;
  readonly pharmacyWarnStockMoveQtyInvalid = $localize`:@@pharmacyModule.warnStockMoveQtyInvalid:Cantidad inválida`;
  readonly pharmacyWarnStockMoveNegativeStock = $localize`:@@pharmacyModule.warnStockMoveNegativeStock:No puedes dejar stock negativo`;
  readonly pharmacyToastStockMoveOk = $localize`:@@pharmacyModule.toastStockMoveOk:Movimiento de inventario aplicado`;
  readonly pharmacyErrStockMoveApply = $localize`:@@pharmacyModule.errStockMoveApply:Error al aplicar movimiento de inventario`;

  readonly pharmacyConfirmLowStockTitle = $localize`:@@pharmacyModule.confirmLowStockTitle:Stock no disponible`;
  readonly pharmacyConfirmLowStockContinue = $localize`:@@pharmacyModule.confirmLowStockContinue:Continuar`;
  readonly pharmacyStatusPrepLabel = $localize`:@@pharmacyModule.statusPrepLabel:En Preparación`;
  readonly pharmacyStatusReadyLabel = $localize`:@@pharmacyModule.statusReadyLabel:Listo`;
  readonly pharmacyToastStatusUpdated = $localize`:@@pharmacyModule.toastStatusUpdated:Estado actualizado`;
  readonly pharmacyToastInPrep = $localize`:@@pharmacyModule.toastInPrep:Solicitud en preparación`;
  readonly pharmacyToastReady = $localize`:@@pharmacyModule.toastReady:Solicitud lista para entregar`;
  readonly pharmacyToastDelivered = $localize`:@@pharmacyModule.toastDelivered:Solicitud marcada como entregada`;
  readonly pharmacyToastReadyPickup = $localize`:@@pharmacyModule.toastReadyPickup:Medicamento listo. Puede entregarse cuando la enfermera lo recoja.`;
  readonly pharmacyToastErrUpdateStatus = $localize`:@@pharmacyModule.toastErrUpdateStatus:Error al actualizar el estado`;
  readonly pharmacyWarnRejectReason = $localize`:@@pharmacyModule.warnRejectReason:Por favor ingresa una razón para rechazar la solicitud`;
  readonly pharmacyToastRejectOk = $localize`:@@pharmacyModule.toastRejectOk:Solicitud rechazada exitosamente`;
  readonly pharmacyToastErrReject = $localize`:@@pharmacyModule.toastErrReject:Error al rechazar la solicitud`;
  readonly pharmacyToastErrDelivery = $localize`:@@pharmacyModule.toastErrDelivery:Error al registrar la entrega`;
  readonly pharmacyStockOkHint = $localize`:@@pharmacyModule.stockOkHint:(ok)`;
  readonly pharmacyStockReviewHint = $localize`:@@pharmacyModule.stockReviewHint:(revisar)`;

  readonly pharmacyWarnExportEmpty = $localize`:@@pharmacyModule.warnExportEmpty:No hay datos para exportar con los filtros actuales.`;
  readonly pharmacyPdfGeneratedPrefix = $localize`:@@pharmacyModule.pdfGeneratedPrefix:Generado:`;
  readonly pharmacyWarnHistoryExportEmpty = $localize`:@@pharmacyModule.warnHistoryExportEmpty:No hay registros en el historial para exportar.`;
  readonly pharmacyWarnInventoryExportEmpty = $localize`:@@pharmacyModule.warnInventoryExportEmpty:No hay filas de inventario para exportar (revisa filtros).`;
  readonly pharmacyToastHistoryCsvOk = $localize`:@@pharmacyModule.toastHistoryCsvOk:Historial exportado a CSV`;
  readonly pharmacyToastInventoryCsvOk = $localize`:@@pharmacyModule.toastInventoryCsvOk:Inventario de bodega exportado a CSV`;
  readonly pharmacyPdfHistoryTitle = $localize`:@@pharmacyModule.pdfHistoryTitle:Historial de farmacia`;
  readonly pharmacyPdfInventoryTitle = $localize`:@@pharmacyModule.pdfInventoryTitle:Inventario de farmacia`;
  readonly pharmacyExportKindDelivery = $localize`:@@pharmacyModule.exportKindDelivery:Entrega`;
  readonly pharmacyExportKindReject = $localize`:@@pharmacyModule.exportKindReject:Rechazo`;

  readonly pharmacyExpColType = $localize`:@@pharmacyModule.expColType:Tipo`;
  readonly pharmacyExpColId = $localize`:@@pharmacyModule.expColId:ID`;
  readonly pharmacyExpColDate = $localize`:@@pharmacyModule.expColDate:Fecha`;
  readonly pharmacyExpColMedication = $localize`:@@pharmacyModule.expColMedication:Medicamento`;
  readonly pharmacyExpColDosage = $localize`:@@pharmacyModule.expColDosage:Dosis`;
  readonly pharmacyExpColQuantity = $localize`:@@pharmacyModule.expColQuantity:Cantidad`;
  readonly pharmacyExpColRequestedBy = $localize`:@@pharmacyModule.expColRequestedBy:Solicitado por`;
  readonly pharmacyExpColPatients = $localize`:@@pharmacyModule.expColPatients:Pacientes`;
  readonly pharmacyExpColDeliveredOrReason = $localize`:@@pharmacyModule.expColDeliveredOrReason:Entregado por / Motivo`;
  readonly pharmacyExpColNotes = $localize`:@@pharmacyModule.expColNotes:Notas`;
  readonly pharmacyExpColDescription = $localize`:@@pharmacyModule.expColDescription:Descripción`;
  readonly pharmacyExpColStockCurrent = $localize`:@@pharmacyModule.expColStockCurrent:Stock actual`;
  readonly pharmacyExpColStockMin = $localize`:@@pharmacyModule.expColStockMin:Stock mínimo`;
  readonly pharmacyExpColLocation = $localize`:@@pharmacyModule.expColLocation:Ubicación`;
  readonly pharmacyExpColExpiry = $localize`:@@pharmacyModule.expColExpiry:Caducidad`;
  readonly pharmacyExpColStatus = $localize`:@@pharmacyModule.expColStatus:Estado`;
  readonly pharmacyExpColExpiryClass = $localize`:@@pharmacyModule.expColExpiryClass:Clasificación caducidad`;
  readonly pharmacyExpColDaysToExpiry = $localize`:@@pharmacyModule.expColDaysToExpiry:Días a caducidad`;

  private readonly pharmacyRequestStatusLabels: Record<string, string> = {
    pending: $localize`:@@pharmacyModule.reqStatusPending:Pendiente`,
    in_preparation: $localize`:@@pharmacyModule.reqStatusInPrep:Preparando`,
    ready: $localize`:@@pharmacyModule.reqStatusReady:Lista`,
    delivered: $localize`:@@pharmacyModule.reqStatusDelivered:Entregada`,
    cancelled: $localize`:@@pharmacyModule.reqStatusCancelled:Rechazada`,
  };

  private readonly pharmacyInventoryStatusBaseLabels: Record<string, string> = {
    available: $localize`:@@pharmacyModule.invStatusAvailable:Disponible`,
    low_stock: $localize`:@@pharmacyModule.invStatusLowStock:Stock bajo`,
    expired: $localize`:@@pharmacyModule.invStatusExpired:Vencido`,
    out_of_stock: $localize`:@@pharmacyModule.invStatusOutStock:Sin stock`,
  };

  private readonly pharmacyMovementTypeLabels: Record<string, string> = {
    entry: $localize`:@@pharmacyModule.moveTypeEntry:Entrada`,
    exit: $localize`:@@pharmacyModule.moveTypeExit:Salida`,
    adjustment: $localize`:@@pharmacyModule.moveTypeAdjustment:Ajuste`,
    delivery: $localize`:@@pharmacyModule.moveTypeDelivery:Entrega (solicitud)`,
  };

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
    private exportService: ExportService,
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

  private pharmacyConfirmDeleteMedicationMessage(medAndDos: string): string {
    return $localize`:@@pharmacyModule.confirmDeleteMedMessage:¿Estás seguro de eliminar ${medAndDos}:medLine: del inventario? Esta acción lo marcará como inactivo.`;
  }

  /** Nombre visible + teléfono si el backend lo envía (User en relaciones). */
  private staffContactLabel(
    u: { firstName?: string; lastName?: string; phone?: string | null } | null | undefined,
    suffix?: string
  ): string {
    if (!u) {
      return this.pharmacyEmDash;
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
            location: i.location || this.pharmacyValueNotAvailable,
            expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : this.pharmacyValueNotAvailable,
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
        this.inventoryError = error?.error?.message || this.pharmacyErrLoadInventory;
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
            requestedBy: this.staffContactLabel(r.requestedBy, this.pharmacyRequestedByRoleNurse),
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
        this.notifyError(this.pharmacyErrLoadRequestsToast);
        this.loadingRequests = false;
        this.requestsError = error?.error?.message || this.pharmacyErrLoadRequests;
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
            notes: h.notes || this.pharmacyHistoryNotesWhenEmpty,
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
        this.historyError = error?.error?.message || this.pharmacyErrLoadHistory;
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

  pharmacyInventoryStatExpiringSoonLabel(days: number): string {
    return $localize`:@@pharmacyModule.statExpiringSoon:Por caducar (${days}:days: d)`;
  }

  pharmacyRequestsPaginationInfo(): string {
    const p = this.requestsPagination;
    return $localize`:@@pharmacyModule.paginationRequestsInfo:Página ${p.page}:page: de ${p.totalPages}:totalPages: · ${p.total}:total: registros`;
  }

  pharmacyHistoryPaginationInfo(): string {
    const p = this.historyPagination;
    return $localize`:@@pharmacyModule.paginationHistoryInfo:Página ${p.page}:page: de ${p.totalPages}:totalPages: · ${p.total}:total: entregas`;
  }

  pharmacyInventoryPaginationInfo(): string {
    const p = this.inventoryPagination;
    return $localize`:@@pharmacyModule.paginationInventoryInfo:Página ${p.page}:page: de ${p.totalPages}:totalPages: · ${p.total}:total: medicamentos`;
  }

  pharmacyKardexPaginationInfo(): string {
    const p = this.kardexPagination;
    return $localize`:@@pharmacyModule.paginationKardexInfo:Página ${p.page}:page: de ${p.totalPages}:totalPages: · ${p.total}:total: movimientos`;
  }

  stockMovementQuantityLabel(): string {
    return this.stockMovementForm.type === 'adjustment'
      ? this.pharmacyStockMoveQtyFinalLabel
      : this.pharmacyStockMoveQtyLabel;
  }

  requestDetailModalTitle(requestId: string): string {
    return $localize`:@@pharmacyModule.requestDetailModalTitle:Detalle de solicitud ${requestId}:id:`;
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
      const labelNext =
        newStatus === 'in_preparation' ? this.pharmacyStatusPrepLabel : this.pharmacyStatusReadyLabel;
      const stockStr = String(request.stockAvailable || 0);
      const message = $localize`:@@pharmacyModule.confirmLowStockMessage:Este medicamento no está disponible en inventario (Stock: ${stockStr}:stock:). ¿Deseas continuar marcándolo como "${labelNext}:nextStatus:"?`;
      const proceed = await this.confirmationService.confirm({
        title: this.pharmacyConfirmLowStockTitle,
        message,
        confirmText: this.pharmacyConfirmLowStockContinue,
        cancelText: this.pharmacyModalCancel,
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
          in_preparation: this.pharmacyToastInPrep,
          ready: this.pharmacyToastReady,
          delivered: this.pharmacyToastDelivered,
        };

        this.notifySuccess(statusMessages[newStatus] || this.pharmacyToastStatusUpdated);
        
        // Recargar datos y actualizar contadores
        this.loadRequests();
        this.loadHistory();

        if (newStatus === 'ready') {
          this.notifyInfo(this.pharmacyToastReadyPickup);
        }
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        this.notifyError(error.error?.message || this.pharmacyToastErrUpdateStatus);
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
      this.notifyWarning(this.pharmacyWarnRejectReason);
      return;
    }

    this.pharmacyService.updateRequestStatus(
      this.selectedRequest.id, 
      'cancelled', 
      this.rejectionReason
    ).subscribe({
      next: () => {
        this.notifySuccess(this.pharmacyToastRejectOk);
        this.closeRejectModal();
        this.loadRequests();
        this.loadHistory();
        this.updateCounters();
      },
      error: (error) => {
        console.error('Error rechazando solicitud:', error);
        this.notifyError(error.error?.message || this.pharmacyToastErrReject);
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
    return type === 'delivery'
      ? $localize`:@@pharmacyModule.historyTypeDelivery:Entregada`
      : $localize`:@@pharmacyModule.historyTypeCancelled:Rechazada`;
  }

  getHistoryDate(item: any): string {
    return item.deliveredAt || item.cancelledAt || this.pharmacyValueNotAvailable;
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
        this.notifySuccess(
          $localize`:@@pharmacyModule.toastDeliveryOk:Entrega confirmada. ID: ${response.deliveryId}:id:`
        );
        
        // Recargar datos para actualizar todo (incluye inventario y kardex en BD)
        this.loadData();
        this.closeDeliveryModal();
      },
      error: (error) => {
        console.error('Error registrando entrega:', error);
        this.notifyError(this.pharmacyToastErrDelivery);
      }
    });
  }

  viewRequestDetails(request: MedicationRequest): void {
    this.notifyInfo(this.pharmacyRequestDetailsNotifyLine(request));
  }

  private pharmacyRequestDetailsNotifyLine(request: MedicationRequest): string {
    const nPatients = request.patients.length;
    return $localize`:@@pharmacyModule.infoRequestDetails:Solicitud ${request.requestId}:rid: : ${request.medication}:med: ${request.dosage}:dos:, cantidad ${request.quantity}:qty:. Pacientes: ${nPatients}:nPat:.`;
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
    return $localize`:@@pharmacyModule.requestActionsTitle:Solicitud ${r.requestId}:id:`;
  }

  requestActionsSummary(r: MedicationRequest): string[] {
    const area =
      r.patients && r.patients.length > 0
        ? r.patients[0].areaName || r.patients[0].area || this.pharmacyValueNotAvailable
        : this.pharmacyValueNotAvailable;
    const stock = Number.isFinite(r.stockAvailable as number) ? String(r.stockAvailable) : '0';
    const requested = r.requestedAtRaw ? new Date(r.requestedAtRaw).toLocaleString('es-ES') : r.requestedAt;
    const updated =
      r.statusUpdatedAtRaw && !Number.isNaN(new Date(r.statusUpdatedAtRaw).getTime())
        ? new Date(r.statusUpdatedAtRaw).toLocaleString('es-ES')
        : null;
    const statusLine = this.requestActionsStatusLineForSummary(r.status);
    const medLine = `${r.medication} ${r.dosage}`;
    return [
      $localize`:@@pharmacyModule.sumLineRequested:Solicitada: ${requested}:when:`,
      updated
        ? $localize`:@@pharmacyModule.sumLineLastChange:Último cambio: ${updated}:when: (${statusLine}:status:)`
        : $localize`:@@pharmacyModule.sumLineStatusOnly:Estado: ${this.getStatusLabel(r.status)}:status:`,
      $localize`:@@pharmacyModule.sumLineRequestedBy:Solicitó: ${r.requestedBy}:who:`,
      $localize`:@@pharmacyModule.sumLineMedication:Medicamento: ${medLine}:medline:`,
      $localize`:@@pharmacyModule.sumLineQuantity:Cantidad: ${r.quantity}:qty:`,
      $localize`:@@pharmacyModule.sumLineArea:Área: ${area}:area:`,
      $localize`:@@pharmacyModule.sumLinePatients:Pacientes: ${(r.patients || []).length}:n:`,
      $localize`:@@pharmacyModule.sumLinePriority:Prioridad: ${r.priority}:prio:`,
      $localize`:@@pharmacyModule.sumLineStock:Stock: ${stock}:stock: ${this.isMedicationAvailable(r) ? this.pharmacyStockOkHint : this.pharmacyStockReviewHint}:hint:`,
    ];
  }

  private requestActionsStatusLineForSummary(status: string): string {
    const st = this.normalizeRequestStatus(status);
    if (st === 'pending') {
      return $localize`:@@pharmacyModule.summaryLinePending:Pendiente`;
    }
    if (st === 'in_preparation') {
      return $localize`:@@pharmacyModule.summaryLineInPrep:Aceptada / en preparación`;
    }
    if (st === 'ready') {
      return $localize`:@@pharmacyModule.summaryLineReady:Lista para entrega`;
    }
    if (st === 'delivered') {
      return $localize`:@@pharmacyModule.summaryLineDelivered:Entregada`;
    }
    return $localize`:@@pharmacyModule.summaryLineCancelled:Rechazada`;
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
    const cad = i.expiryDateRaw ? String(i.expiryDateRaw).slice(0, 10) : this.pharmacyEmDash;
    return [
      $localize`:@@pharmacyModule.invSumStockLine:Stock: ${i.stock}:st: (mín: ${i.minStock}:min:)`,
      $localize`:@@pharmacyModule.invSumLocation:Ubicación: ${i.location || this.pharmacyEmDash}:loc:`,
      $localize`:@@pharmacyModule.invSumExpiry:Caducidad: ${cad}:cad:`,
      $localize`:@@pharmacyModule.invSumStatus:Estado: ${this.getInventoryStatusLabel(i)}:st:`,
    ];
  }

  openHistoryActions(item: CombinedHistoryItem): void {
    this.selectedHistoryForActions = item;
  }

  closeHistoryActions(): void {
    this.selectedHistoryForActions = null;
  }

  historyActionsTitle(i: CombinedHistoryItem): string {
    const id = String(i.deliveryId || i.requestId || '').trim();
    return i.type === 'delivery'
      ? $localize`:@@pharmacyModule.historyActionTitleDelivery:Entrega ${id}:id:`
      : $localize`:@@pharmacyModule.historyActionTitleReject:Rechazo ${id}:id:`;
  }

  historyActionsSummary(i: CombinedHistoryItem): string[] {
    const when = this.getHistoryDate(i);
    const requestedAt =
      i.requestedAt && !Number.isNaN(new Date(i.requestedAt).getTime())
        ? new Date(i.requestedAt).toLocaleString('es-ES')
        : null;
    const who = i.requestedBy || this.pharmacyEmDash;
    const detail = i.type === 'delivery' ? i.deliveredBy || this.pharmacyEmDash : i.notes || this.pharmacyEmDash;
    const medLine = `${i.medication} ${i.dosage}`;
    return [
      requestedAt ? $localize`:@@pharmacyModule.histSumRequested:Solicitada: ${requestedAt}:when:` : null,
      $localize`:@@pharmacyModule.histSumDate:Fecha: ${when}:when:`,
      $localize`:@@pharmacyModule.histSumMedication:Medicamento: ${medLine}:medline:`,
      $localize`:@@pharmacyModule.histSumQty:Cantidad: ${i.quantity}:qty:`,
      $localize`:@@pharmacyModule.histSumBy:Solicitado por: ${who}:who:`,
      i.type === 'delivery'
        ? $localize`:@@pharmacyModule.histSumDeliveredBy:Entregado por: ${detail}:detail:`
        : $localize`:@@pharmacyModule.histSumReason:Razón: ${detail}:detail:`,
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

  private getHistoryExportHeaders(): string[] {
    return [
      this.pharmacyExpColType,
      this.pharmacyExpColId,
      this.pharmacyExpColDate,
      this.pharmacyExpColMedication,
      this.pharmacyExpColDosage,
      this.pharmacyExpColQuantity,
      this.pharmacyExpColRequestedBy,
      this.pharmacyExpColPatients,
      this.pharmacyExpColDeliveredOrReason,
      this.pharmacyExpColNotes,
    ];
  }

  private buildHistoryExportRows(): Record<string, string | number>[] {
    return this.filteredHistory.map((item) => ({
      [this.pharmacyExpColType]: this.historyExportKindLabel(item),
      [this.pharmacyExpColId]: item.deliveryId || item.requestId || '',
      [this.pharmacyExpColDate]: this.getHistoryDate(item),
      [this.pharmacyExpColMedication]: item.medication,
      [this.pharmacyExpColDosage]: item.dosage,
      [this.pharmacyExpColQuantity]: item.quantity,
      [this.pharmacyExpColRequestedBy]: item.requestedBy,
      [this.pharmacyExpColPatients]: this.formatHistoryPatients(item),
      [this.pharmacyExpColDeliveredOrReason]: this.historyDeliveredOrReason(item),
      [this.pharmacyExpColNotes]: item.type === 'delivery' ? item.notes || '' : '',
    }));
  }

  private getInventoryExportHeaders(): string[] {
    return [
      this.pharmacyExpColMedication,
      this.pharmacyExpColDosage,
      this.pharmacyExpColDescription,
      this.pharmacyExpColStockCurrent,
      this.pharmacyExpColStockMin,
      this.pharmacyExpColLocation,
      this.pharmacyExpColExpiry,
      this.pharmacyExpColStatus,
      this.pharmacyExpColExpiryClass,
      this.pharmacyExpColDaysToExpiry,
    ];
  }

  private buildInventoryExportRows(): Record<string, string | number>[] {
    return this.filteredInventory.map((item) => {
      const cad = item.expiryDateRaw ? String(item.expiryDateRaw).slice(0, 10) : '';
      return {
        [this.pharmacyExpColMedication]: item.medication,
        [this.pharmacyExpColDosage]: item.dosage,
        [this.pharmacyExpColDescription]: item.description || '',
        [this.pharmacyExpColStockCurrent]: item.stock,
        [this.pharmacyExpColStockMin]: item.minStock,
        [this.pharmacyExpColLocation]: item.location,
        [this.pharmacyExpColExpiry]: cad,
        [this.pharmacyExpColStatus]: this.getInventoryStatusLabel(item),
        [this.pharmacyExpColExpiryClass]: item.expiryClassification,
        [this.pharmacyExpColDaysToExpiry]: item.daysToExpiry ?? '',
      };
    });
  }

  exportHistoryCsv(): void {
    if (!this.filteredHistory.length) {
      this.notifyWarning(this.pharmacyWarnHistoryExportEmpty);
      return;
    }
    try {
      const data = this.buildHistoryExportRows();
      this.exportService.exportToCSV(data, {
        filename: `${this.buildExportFilename('historial_farmacia')}.csv`,
        headers: this.getHistoryExportHeaders(),
      });
      this.notifySuccess(this.pharmacyToastHistoryCsvOk);
    } catch (e: unknown) {
      this.notifyError(String((e as Error)?.message || e));
    }
  }

  exportHistoryPdf(): void {
    if (!this.filteredHistory.length) {
      this.notifyWarning(this.pharmacyWarnHistoryExportEmpty);
      return;
    }
    try {
      const data = this.buildHistoryExportRows();
      this.exportService.exportToPdf(data, {
        title: this.pharmacyPdfHistoryTitle,
        filename: `${this.buildExportFilename('historial_farmacia')}.pdf`,
        headers: this.getHistoryExportHeaders(),
        generatedAtLabel: this.pharmacyPdfGeneratedPrefix,
        orientation: 'landscape',
      });
      this.notifySuccess($localize`:@@pharmacyModule.toastHistoryPdfOk:PDF de historial descargado`);
    } catch (e: unknown) {
      this.notifyError(String((e as Error)?.message || e));
    }
  }

  exportInventoryCsv(): void {
    if (!this.filteredInventory.length) {
      this.notifyWarning(this.pharmacyWarnInventoryExportEmpty);
      return;
    }
    try {
      const data = this.buildInventoryExportRows();
      this.exportService.exportToCSV(data, {
        filename: `${this.buildExportFilename('bodega_inventario')}.csv`,
        headers: this.getInventoryExportHeaders(),
      });
      this.notifySuccess(this.pharmacyToastInventoryCsvOk);
    } catch (e: unknown) {
      this.notifyError(String((e as Error)?.message || e));
    }
  }

  exportInventoryPdf(): void {
    if (!this.filteredInventory.length) {
      this.notifyWarning(this.pharmacyWarnInventoryExportEmpty);
      return;
    }
    try {
      const data = this.buildInventoryExportRows();
      this.exportService.exportToPdf(data, {
        title: this.pharmacyPdfInventoryTitle,
        filename: `${this.buildExportFilename('bodega_inventario')}.pdf`,
        headers: this.getInventoryExportHeaders(),
        generatedAtLabel: this.pharmacyPdfGeneratedPrefix,
        orientation: 'landscape',
      });
      this.notifySuccess($localize`:@@pharmacyModule.toastInventoryPdfOk:PDF de inventario descargado`);
    } catch (e: unknown) {
      this.notifyError(String((e as Error)?.message || e));
    }
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

  private historyExportKindLabel(item: CombinedHistoryItem | DeliveryHistoryItem): string {
    return item.type === 'delivery' ? this.pharmacyExportKindDelivery : this.pharmacyExportKindReject;
  }

  getStatusLabel(status: string): string {
    return this.pharmacyRequestStatusLabels[status] || status;
  }

  getInventoryStatusLabel(item: InventoryItem): string {
    if (item.expiryClassification === 'expired') {
      return $localize`:@@pharmacyModule.invLabelExpiredByDate:Vencido (caducidad)`;
    }
    if (item.expiryClassification === 'expiring_soon') {
      const d = item.daysToExpiry;
      const w = item.expiringSoonDays;
      return d != null
        ? $localize`:@@pharmacyModule.invLabelExpiringSoonDays:Por caducar (${d}:days: días · ventana ${w}:window:d)`
        : $localize`:@@pharmacyModule.invLabelExpiringSoonWindow:Por caducar (ventana ${w}:window:d)`;
    }
    return this.pharmacyInventoryStatusBaseLabels[item.status] || item.status;
  }

  expiringSoonWindowLabel(): number {
    return this.inventory[0]?.expiringSoonDays ?? 30;
  }

  getMovementTypeLabel(type: string): string {
    return this.pharmacyMovementTypeLabels[type] || type;
  }

  openKardexModal(item: InventoryItem): void {
    if (!item.id) {
      this.notifyError(this.pharmacyErrMedicationId);
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
          this.kardexError = err?.error?.message || this.pharmacyErrKardexLoad;
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
      this.notifyWarning(this.pharmacyWarnAddMedNameDosage);
      return;
    }

    if (this.newMedicationForm.stock < 0) {
      this.notifyWarning(this.pharmacyWarnAddMedStockNegative);
      return;
    }

    this.pharmacyService.createMedication(this.newMedicationForm).subscribe({
      next: () => {
        this.notifySuccess(this.pharmacyToastAddMedOk);
        this.closeAddMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error creando medicamento:', error);
        this.notifyError(error.error?.message || this.pharmacyErrCreateMedication);
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
      this.notifyError(this.pharmacyErrMedicationId);
      return;
    }

    const medAndDos = `${this.selectedMedicationForDelete.medication} ${this.selectedMedicationForDelete.dosage}`.trim();
    const confirmed = await this.confirmationService.confirm({
      title: this.pharmacyConfirmDeleteMedTitle,
      message: this.pharmacyConfirmDeleteMedicationMessage(medAndDos),
      confirmText: this.pharmacyConfirmDeleteMedConfirm,
      cancelText: this.pharmacyConfirmDeleteMedCancel,
      type: 'danger',
    });
    if (!confirmed) {
      return;
    }

    this.pharmacyService.deleteMedication(this.selectedMedicationForDelete.id).subscribe({
      next: () => {
        this.notifySuccess(this.pharmacyToastDeleteMedOk);
        this.closeDeleteMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error eliminando medicamento:', error);
        this.notifyError(error.error?.message || this.pharmacyErrDeleteMedication);
      }
    });
  }

  openStockMovementModal(item: InventoryItem, type: 'entry' | 'exit' | 'adjustment'): void {
    if (!item.id) {
      this.notifyError(this.pharmacyErrMedicationId);
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
      this.notifyError(this.pharmacyErrStockMoveMedNotFound);
      return;
    }

    const qty = Number(this.stockMovementForm.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      this.notifyWarning(this.pharmacyWarnStockMoveQtyInvalid);
      return;
    }

    let newStock = this.selectedInventoryItem.stock;
    if (this.stockMovementForm.type === 'entry') newStock += qty;
    if (this.stockMovementForm.type === 'exit') newStock -= qty;
    if (this.stockMovementForm.type === 'adjustment') newStock = qty;

    if (newStock < 0) {
      this.notifyWarning(this.pharmacyWarnStockMoveNegativeStock);
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
          this.notifySuccess(this.pharmacyToastStockMoveOk);
          this.closeStockMovementModal();
          this.loadData();
          this.refreshKardexIfOpen();
        },
        error: (error) => {
          console.error('Error aplicando movimiento:', error);
          this.notifyError(error.error?.message || this.pharmacyErrStockMoveApply);
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
