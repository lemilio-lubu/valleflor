'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronLeft,
  Archive, ArchiveRestore, Info, Search,
} from 'lucide-react';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Producto {
  id: string;
  nombre: string;
  activo?: boolean;
  motivoBaja?: string | null;
  eliminable?: boolean;
}
interface Variedad { id: string; nombre: string; productoId: string; activo?: boolean; motivoBaja?: string | null; eliminable?: boolean; }
interface Color {
  id: string;
  nombre: string;
  variedadId: string;
  codigo: string | null;
  nombreComercial: string | null;
  tallosPorCaja: number;
  activo?: boolean;
  motivoBaja?: string | null;
  eliminable?: boolean;
}
type CatalogItem = Producto | Variedad | Color;
type ConfirmItem = { type: 'producto' | 'variedad' | 'color'; item: CatalogItem };

const TIPO_LABEL: Record<ConfirmItem['type'], string> = {
  producto: 'el producto',
  variedad: 'la variedad',
  color: 'el color',
};

interface ColorFormValues {
  nombre: string;
  codigo: string;
  nombreComercial: string;
  tallosPorCaja: string;
}

export interface ColorSaveValues {
  nombre: string;
  codigo: string;
  nombreComercial: string | null;
  tallosPorCaja: number;
}

// ─── Color modal (definición productiva: color / código / nombre comercial / caja) ──
function ColorModal({ initial, onSave, onCancel, isPending }: {
  initial: Color | null;
  onSave: (values: ColorSaveValues) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [values, setValues] = useState<ColorFormValues>({
    nombre: initial?.nombre ?? '',
    codigo: initial?.codigo ?? '',
    nombreComercial: initial?.nombreComercial ?? '',
    tallosPorCaja: initial?.tallosPorCaja != null ? String(initial.tallosPorCaja) : '400',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const canSave = values.nombre.trim() !== '' && values.codigo.trim() !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      nombre: values.nombre.trim().toUpperCase(),
      codigo: values.codigo.trim().toUpperCase(),
      nombreComercial: values.nombreComercial.trim() !== '' ? values.nombreComercial.trim().toUpperCase() : null,
      tallosPorCaja: values.tallosPorCaja.trim() !== '' ? Number(values.tallosPorCaja) : 400,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(16,24,40,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="bg-surface-raised rounded-xl border border-surface-border w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 rounded-md hover:bg-surface-overlay flex items-center justify-center transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-carbon-400" />
        </button>

        <h3 className="text-lg font-semibold text-carbon-50 mb-5">
          {initial ? 'Editar definición' : 'Nueva definición'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Color <span className="text-red-500 ml-0.5">*</span></label>
              <input
                autoFocus
                className="input-field"
                placeholder="Ej: DARK"
                value={values.nombre}
                onChange={(e) => setValues((v) => ({ ...v, nombre: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Código <span className="text-red-500 ml-0.5">*</span></label>
              <input
                className="input-field"
                placeholder="Ej: 6554"
                value={values.codigo}
                onChange={(e) => setValues((v) => ({ ...v, codigo: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Nombre comercial</label>
              <input
                className="input-field"
                placeholder="Ej: NELANDES ASTASSUS"
                value={values.nombreComercial}
                onChange={(e) => setValues((v) => ({ ...v, nombreComercial: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Tallos por caja</label>
              <input
                type="number"
                min={1}
                className="input-field"
                placeholder="400"
                value={values.tallosPorCaja}
                onChange={(e) => setValues((v) => ({ ...v, tallosPorCaja: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave || isPending} className="btn-primary">
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inline input (producto / variedad) ──────────────────────────────────────
function InlineInput({ placeholder, initialValue = '', onSave, onCancel, isPending }: {
  placeholder: string; initialValue?: string;
  onSave: (v: string) => void; onCancel: () => void; isPending: boolean;
}) {
  const [val, setVal] = useState(initialValue);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) onSave(val.trim()); }}
      className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input autoFocus className="input-field text-xs py-1.5 h-7 flex-1 min-w-0"
        placeholder={placeholder} value={val}
        onChange={(e) => setVal(e.target.value.toUpperCase())} required />
      <button type="submit" disabled={isPending || !val.trim()}
        className="w-7 h-7 rounded-md bg-verde-600 hover:bg-verde-700 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors">
        <Check className="w-3.5 h-3.5 text-white" />
      </button>
      <button type="button" onClick={onCancel}
        className="w-7 h-7 rounded-md border border-surface-border hover:bg-surface-overlay flex items-center justify-center flex-shrink-0 transition-colors">
        <X className="w-3.5 h-3.5 text-carbon-400" />
      </button>
    </form>
  );
}

// ─── Baja modal (captura el motivo) ──────────────────────────────────────────
function BajaModal({ tipo, nombre, onConfirm, onCancel, isPending }: {
  tipo: string; nombre: string;
  onConfirm: (motivo: string) => void; onCancel: () => void; isPending: boolean;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,24,40,0.5)' }} onClick={onCancel}>
      <div className="bg-surface-raised rounded-xl border border-surface-border w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-carbon-50">Desactivar {tipo}</h3>
          <button onClick={onCancel}
            className="w-7 h-7 rounded-md hover:bg-surface-overlay flex items-center justify-center text-carbon-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-carbon-300 mb-3">
          &quot;{nombre}&quot; quedará oculto del catálogo y se quitará de las semanas
          actual y futuras. Podés activarlo más adelante.
        </p>
        <label className="form-label" htmlFor="motivo-baja">Motivo (opcional)</label>
        <textarea id="motivo-baja" className="input-field w-full text-sm" rows={3}
          placeholder="Ej: fin de temporada" value={motivo}
          onChange={(e) => setMotivo(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost text-sm px-4 py-2">Cancelar</button>
          <button onClick={() => onConfirm(motivo.trim())} disabled={isPending}
            className="btn-danger text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
            Desactivar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────
function Column<T extends { id: string; nombre: string; activo?: boolean; eliminable?: boolean; motivoBaja?: string | null }>({
  title, subtitle, items, isLoading, selectedId, onSelect,
  onAdd, onEdit, onDelete, onDarBaja, onDarAlta, onVerMotivo,
  addingNew, editingId, addPlaceholder,
  onSaveNew, onCancelNew, onSaveEdit, onCancelEdit,
  isSavingNew, isSavingEdit, emptyText, hasArrow = false,
  inline = true, metaOf,
}: {
  title: string; subtitle?: string; items: T[]; isLoading?: boolean;
  selectedId: string | null; onSelect: (item: T) => void;
  onAdd: () => void; onEdit: (item: T) => void; onDelete: (item: T) => void;
  onDarBaja: (item: T) => void; onDarAlta: (item: T) => void;
  onVerMotivo: (item: T) => void;
  addingNew: boolean; editingId: string | null; addPlaceholder: string;
  onSaveNew: (n: string) => void; onCancelNew: () => void;
  onSaveEdit: (n: string) => void; onCancelEdit: () => void;
  isSavingNew: boolean; isSavingEdit: boolean; emptyText: string; hasArrow?: boolean;
  inline?: boolean; metaOf?: (item: T) => string | null;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.nombre.toLowerCase().includes(q)) : items;
  return (
    <div className="flex flex-col h-full border border-surface-border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-surface-border bg-surface-overlay flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-carbon-50 uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[11px] text-carbon-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <span className="text-[11px] text-carbon-400 tabular-nums flex-shrink-0">
            {filtered.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-carbon-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-white border border-surface-border rounded-md pl-7 pr-7 py-1 text-xs text-carbon-50 placeholder:text-carbon-400 focus:outline-none focus:ring-1 focus:ring-verde-600 focus:border-verde-600"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} title="Limpiar búsqueda"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-carbon-400 hover:text-carbon-50 hover:bg-surface-overlay transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="p-2 space-y-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-surface-overlay rounded animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && items.length === 0 && !addingNew && (
          <div className="flex items-center justify-center h-full py-10 px-4">
            <p className="text-carbon-400 text-xs text-center">{emptyText}</p>
          </div>
        )}
        {!isLoading && items.length > 0 && filtered.length === 0 && (
          <div className="flex items-center justify-center h-full py-10 px-4">
            <p className="text-carbon-400 text-xs text-center">Sin coincidencias</p>
          </div>
        )}
        {!isLoading && filtered.map((item) => {
          const isSelected = selectedId === item.id;
          const isEditing = inline && editingId === item.id;
          const meta = metaOf?.(item);
          const inactivo = item.activo === false;
          return (
            <div key={item.id} onClick={() => !isEditing && onSelect(item)}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-surface-border/30 last:border-0 transition-colors ${
                isSelected ? 'bg-verde-50' : 'hover:bg-surface-overlay'
              } ${inactivo ? 'opacity-50' : ''}`}>
              {isEditing ? (
                <div className="flex-1 min-w-0">
                  <InlineInput initialValue={item.nombre} placeholder={addPlaceholder}
                    onSave={onSaveEdit} onCancel={onCancelEdit} isPending={isSavingEdit} />
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-sm truncate flex items-center gap-1.5 ${
                      inactivo ? 'text-carbon-400' : isSelected ? 'text-verde-700 font-medium' : 'text-carbon-50'
                    }`}>
                      <span className="truncate">{item.nombre}</span>
                      {inactivo && (
                        <span className="text-[10px] uppercase tracking-wide text-dorado-500 border border-dorado-400/50 rounded-sm px-1 py-0.5 flex-shrink-0">
                          Inactivo
                        </span>
                      )}
                    </span>
                    {meta && <span className="block text-[11px] text-carbon-400 truncate">{meta}</span>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inactivo ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onVerMotivo(item); }} title="Ver motivo de desactivación"
                          className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-verde-600 hover:bg-verde-50 transition-colors">
                          <Info className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDarAlta(item); }} title="Activar"
                          className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-agro-600 hover:bg-agro-50 transition-colors">
                          <ArchiveRestore className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} title="Editar"
                          className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-verde-600 hover:bg-verde-50 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDarBaja(item); }} title="Desactivar"
                          className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-dorado-500 hover:bg-dorado-400/10 transition-colors">
                          <Archive className="w-3 h-3" />
                        </button>
                        {/* "Eliminar" (borrado físico) solo cuando no hay datos asociados.
                            Si los hay, la única opción es "Desactivar" (reversible). */}
                        {item.eliminable === true && (
                          <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} title="Eliminar definitivamente"
                            className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {hasArrow && isSelected && (
                    <ChevronRight className="w-3.5 h-3.5 text-verde-500 flex-shrink-0" />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add area */}
      <div className="px-3 py-2 border-t border-surface-border bg-surface-raised flex-shrink-0">
        {inline && addingNew ? (
          <InlineInput placeholder={addPlaceholder} onSave={onSaveNew}
            onCancel={onCancelNew} isPending={isSavingNew} />
        ) : (
          <button onClick={onAdd}
            className="flex items-center gap-1.5 text-xs text-carbon-400 hover:text-verde-600 transition-colors w-full py-0.5">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export function CatalogoProductos() {
  const qc = useQueryClient();

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [selectedVariedad, setSelectedVariedad] = useState<Variedad | null>(null);
  const [mobileLevel, setMobileLevel] = useState<'productos' | 'variedades' | 'colores'>('productos');
  // Preferencia recordada en este navegador (localStorage). Lazy init seguro para SSR.
  const [mostrarInactivos, setMostrarInactivos] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('catalogo:mostrarInactivos') === 'true';
  });
  useEffect(() => {
    window.localStorage.setItem('catalogo:mostrarInactivos', String(mostrarInactivos));
  }, [mostrarInactivos]);

  const [addingProducto, setAddingProducto] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [addingVariedad, setAddingVariedad] = useState(false);
  const [editingVariedad, setEditingVariedad] = useState<Variedad | null>(null);
  const [colorModal, setColorModal] = useState<{ open: boolean; edit: Color | null }>({ open: false, edit: null });
  const [confirmDelete, setConfirmDelete] = useState<ConfirmItem | null>(null);
  const [bajaItem, setBajaItem] = useState<ConfirmItem | null>(null);
  const [motivoItem, setMotivoItem] = useState<{ nombre: string; motivoBaja?: string | null } | null>(null);

  const showCol2 = !!selectedProducto;
  const showCol3 = !!selectedVariedad;

  const col1W = showCol3 ? 'calc(33.33% - 16px)' : showCol2 ? 'calc(50% - 12px)' : '100%';
  const col2W = showCol3 ? 'calc(33.33% - 16px)' : showCol2 ? 'calc(50% - 12px)' : '0%';
  const col3W = showCol3 ? 'calc(33.33% - 16px)' : '0%';

  const inactivosParam = mostrarInactivos ? { incluirInactivos: 'true' } : {};

  const { data: productos = [], isLoading: loadingProductos } = useQuery<Producto[]>({
    queryKey: ['productos', mostrarInactivos],
    queryFn: () => api.get('/productos', { params: inactivosParam }).then((r) => r.data),
  });
  const { data: variedades = [], isLoading: loadingVariedades } = useQuery<Variedad[]>({
    queryKey: ['variedades', selectedProducto?.id, mostrarInactivos],
    queryFn: () => api.get('/variedades', { params: { productoId: selectedProducto!.id, ...inactivosParam } }).then((r) => r.data),
    enabled: !!selectedProducto,
  });
  const { data: colores = [], isLoading: loadingColores } = useQuery<Color[]>({
    queryKey: ['colores', selectedVariedad?.id, mostrarInactivos],
    queryFn: () => api.get('/colores', { params: { variedadId: selectedVariedad!.id, ...inactivosParam } }).then((r) => r.data),
    enabled: !!selectedVariedad,
  });

  const colorMeta = (c: Color) => {
    const parts: string[] = [];
    if (c.codigo) parts.push(`Cód: ${c.codigo}`);
    if (c.nombreComercial) parts.push(c.nombreComercial);
    parts.push(`${c.tallosPorCaja} t/caja`);
    return parts.join(' · ');
  };

  // Invalida todo lo que una baja/alta/eliminación puede afectar.
  function invalidateAfterCatalogChange() {
    qc.invalidateQueries({ queryKey: ['productos'] });
    qc.invalidateQueries({ queryKey: ['variedades', selectedProducto?.id] });
    qc.invalidateQueries({ queryKey: ['colores', selectedVariedad?.id] });
    qc.invalidateQueries({ queryKey: ['consolidado-diario'] });
    qc.invalidateQueries({ queryKey: ['consolidado-semanal'] });
    qc.invalidateQueries({ queryKey: ['plantilla'] });
    qc.invalidateQueries({ queryKey: ['base-semanal'] });
  }

  const saveProducto = useMutation({
    mutationFn: (nombre: string) =>
      editingProducto
        ? api.patch(`/productos/${editingProducto.id}`, { nombre })
        : api.post('/productos', { nombre }),
    onSuccess: (res, nombre) => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      qc.invalidateQueries({ queryKey: ['consolidado-diario'] });
      qc.invalidateQueries({ queryKey: ['consolidado-semanal'] });
      toast.success(editingProducto ? `Producto "${nombre}" actualizado` : `Producto "${nombre}" creado`);
      if (!editingProducto) setSelectedProducto(res.data);
      setAddingProducto(false); setEditingProducto(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });
  const removeProducto = useMutation({
    mutationFn: (id: string) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      invalidateAfterCatalogChange();
      toast.success(`Producto "${confirmDelete?.item.nombre}" eliminado`);
      if (selectedProducto?.id === confirmDelete?.item.id) { setSelectedProducto(null); setSelectedVariedad(null); }
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  const saveVariedad = useMutation({
    mutationFn: (nombre: string) =>
      editingVariedad ? api.patch(`/variedades/${editingVariedad.id}`, { nombre }) : api.post('/variedades', { nombre, productoId: selectedProducto!.id }),
    onSuccess: (res, nombre) => {
      qc.invalidateQueries({ queryKey: ['variedades', selectedProducto?.id] });
      toast.success(editingVariedad ? `Variedad "${nombre}" actualizada` : `Variedad "${nombre}" creada`);
      if (!editingVariedad) setSelectedVariedad(res.data);
      setAddingVariedad(false); setEditingVariedad(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });
  const removeVariedad = useMutation({
    mutationFn: (id: string) => api.delete(`/variedades/${id}`),
    onSuccess: () => {
      invalidateAfterCatalogChange();
      toast.success(`Variedad "${confirmDelete?.item.nombre}" eliminada`);
      if (selectedVariedad?.id === confirmDelete?.item.id) setSelectedVariedad(null);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  const saveColor = useMutation({
    mutationFn: (values: ColorSaveValues) =>
      colorModal.edit
        ? api.patch(`/colores/${colorModal.edit.id}`, values)
        : api.post('/colores', { ...values, variedadId: selectedVariedad!.id }),
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: ['colores', selectedVariedad?.id] });
      qc.invalidateQueries({ queryKey: ['consolidado-diario'] });
      qc.invalidateQueries({ queryKey: ['consolidado-semanal'] });
      toast.success(colorModal.edit ? `Color "${values.nombre}" actualizado` : `Color "${values.nombre}" creado`);
      setColorModal({ open: false, edit: null });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });
  const removeColor = useMutation({
    mutationFn: (id: string) => api.delete(`/colores/${id}`),
    onSuccess: () => {
      invalidateAfterCatalogChange();
      toast.success(`Color "${confirmDelete?.item.nombre}" eliminado`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  // ── Desactivar / activar ─────────────────────────────────────────────────────
  const endpointFor = (type: ConfirmItem['type']) =>
    type === 'producto' ? 'productos' : type === 'variedad' ? 'variedades' : 'colores';

  const darBaja = useMutation({
    mutationFn: ({ type, id, motivoBaja }: { type: ConfirmItem['type']; id: string; motivoBaja: string }) =>
      api.patch(`/${endpointFor(type)}/${id}/baja`, { motivoBaja }),
    onSuccess: () => {
      invalidateAfterCatalogChange();
      toast.success(`"${bajaItem?.item.nombre}" desactivado`);
      setBajaItem(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo desactivar'),
  });

  const darAlta = useMutation({
    mutationFn: ({ type, id }: { type: ConfirmItem['type']; id: string }) =>
      api.patch(`/${endpointFor(type)}/${id}/alta`),
    onSuccess: (_, vars) => {
      invalidateAfterCatalogChange();
      toast.success('Activado');
      void vars;
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se pudo activar'),
  });

  function handleDeleteConfirm() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'producto') removeProducto.mutate(confirmDelete.item.id);
    else if (confirmDelete.type === 'variedad') removeVariedad.mutate(confirmDelete.item.id);
    else removeColor.mutate(confirmDelete.item.id);
  }

  const openNewColor = () => setColorModal({ open: true, edit: null });
  const openEditColor = (c: Color) => setColorModal({ open: true, edit: c });

  return (
    <>
      {/* Toggle: mostrar inactivos */}
      <div className="flex items-center justify-end mb-3">
        <label className="flex items-center gap-2 text-xs text-carbon-300 cursor-pointer select-none">
          <input type="checkbox" checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="accent-verde-600 w-3.5 h-3.5" />
          Mostrar inactivos
        </label>
      </div>

      {/* ─── Mobile: drill-down con breadcrumb ─── */}
      <div className="md:hidden flex flex-col" style={{ height: '480px' }}>
        <div className="flex items-center gap-2 mb-3 text-xs">
          {mobileLevel !== 'productos' && (
            <button
              type="button"
              onClick={() => {
                if (mobileLevel === 'colores') setMobileLevel('variedades');
                else if (mobileLevel === 'variedades') setMobileLevel('productos');
              }}
              className="w-8 h-8 rounded-md border border-surface-border hover:bg-surface-overlay flex items-center justify-center flex-shrink-0 transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="w-4 h-4 text-carbon-300" />
            </button>
          )}
          <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMobileLevel('productos')}
              className={`whitespace-nowrap px-1.5 py-0.5 rounded transition-colors ${
                mobileLevel === 'productos' ? 'text-carbon-50 font-medium' : 'text-carbon-400 hover:text-verde-600'
              }`}
            >
              Productos
            </button>
            {selectedProducto && (
              <>
                <ChevronRight className="w-3 h-3 text-carbon-400 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setMobileLevel('variedades')}
                  className={`whitespace-nowrap px-1.5 py-0.5 rounded transition-colors truncate max-w-[120px] ${
                    mobileLevel === 'variedades' ? 'text-carbon-50 font-medium' : 'text-carbon-400 hover:text-verde-600'
                  }`}
                  title={selectedProducto.nombre}
                >
                  {selectedProducto.nombre}
                </button>
              </>
            )}
            {selectedVariedad && mobileLevel === 'colores' && (
              <>
                <ChevronRight className="w-3 h-3 text-carbon-400 flex-shrink-0" />
                <span className="whitespace-nowrap px-1.5 py-0.5 text-carbon-50 font-medium truncate max-w-[120px]" title={selectedVariedad.nombre}>
                  {selectedVariedad.nombre}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex-1 min-h-0">
          {mobileLevel === 'productos' && (
            <Column
              title="Productos" items={productos} isLoading={loadingProductos}
              selectedId={selectedProducto?.id ?? null}
              onSelect={(p) => {
                setSelectedProducto(p); setSelectedVariedad(null);
                setAddingVariedad(false); setEditingVariedad(null);
                setMobileLevel('variedades');
              }}
              onAdd={() => { setEditingProducto(null); setAddingProducto(true); }}
              onEdit={(p) => { setEditingProducto(p as Producto); setAddingProducto(false); }}
              onDelete={(p) => setConfirmDelete({ type: 'producto', item: p })}
              onDarBaja={(p) => setBajaItem({ type: 'producto', item: p })}
              onDarAlta={(p) => darAlta.mutate({ type: 'producto', id: p.id })}
              onVerMotivo={(p) => setMotivoItem(p)}
              addingNew={addingProducto} editingId={editingProducto?.id ?? null}
              addPlaceholder="Ej: BELLANDES"
              onSaveNew={(n) => saveProducto.mutate(n)} onCancelNew={() => setAddingProducto(false)}
              onSaveEdit={(n) => saveProducto.mutate(n)} onCancelEdit={() => setEditingProducto(null)}
              isSavingNew={saveProducto.isPending && !editingProducto}
              isSavingEdit={saveProducto.isPending && !!editingProducto}
              emptyText="Sin productos. Agrega el primero." hasArrow
            />
          )}
          {mobileLevel === 'variedades' && selectedProducto && (
            <Column
              title="Variedades" subtitle={`de ${selectedProducto.nombre}`}
              items={variedades} isLoading={loadingVariedades}
              selectedId={selectedVariedad?.id ?? null}
              onSelect={(v) => {
                setSelectedVariedad(v as Variedad);
                setColorModal({ open: false, edit: null });
                setMobileLevel('colores');
              }}
              onAdd={() => { setEditingVariedad(null); setAddingVariedad(true); }}
              onEdit={(v) => { setEditingVariedad(v as Variedad); setAddingVariedad(false); }}
              onDelete={(v) => setConfirmDelete({ type: 'variedad', item: v })}
              onDarBaja={(v) => setBajaItem({ type: 'variedad', item: v })}
              onDarAlta={(v) => darAlta.mutate({ type: 'variedad', id: v.id })}
              onVerMotivo={(v) => setMotivoItem(v)}
              addingNew={addingVariedad} editingId={editingVariedad?.id ?? null}
              addPlaceholder="Ej: FREEDOM"
              onSaveNew={(n) => saveVariedad.mutate(n)} onCancelNew={() => setAddingVariedad(false)}
              onSaveEdit={(n) => saveVariedad.mutate(n)} onCancelEdit={() => setEditingVariedad(null)}
              isSavingNew={saveVariedad.isPending && !editingVariedad}
              isSavingEdit={saveVariedad.isPending && !!editingVariedad}
              emptyText="Sin variedades. Agrega la primera." hasArrow
            />
          )}
          {mobileLevel === 'colores' && selectedVariedad && (
            <Column
              title="Colores" subtitle={`de ${selectedVariedad.nombre}`}
              items={colores} isLoading={loadingColores}
              selectedId={null} onSelect={() => {}}
              onAdd={openNewColor}
              onEdit={(c) => openEditColor(c as Color)}
              onDelete={(c) => setConfirmDelete({ type: 'color', item: c })}
              onDarBaja={(c) => setBajaItem({ type: 'color', item: c })}
              onDarAlta={(c) => darAlta.mutate({ type: 'color', id: c.id })}
              onVerMotivo={(c) => setMotivoItem(c)}
              addingNew={false} editingId={null}
              addPlaceholder="Color"
              onSaveNew={() => {}} onCancelNew={() => {}}
              onSaveEdit={() => {}} onCancelEdit={() => {}}
              isSavingNew={false} isSavingEdit={false}
              emptyText="Sin colores. Agrega el primero."
              inline={false} metaOf={(c) => colorMeta(c as Color)}
            />
          )}
        </div>
      </div>

      {/* ─── Desktop: cascade de 3 columnas ─── */}
      <div className="hidden md:flex gap-0 overflow-hidden" style={{ height: '420px' }}>

        {/* Columna 1 — Productos */}
        <div style={{ width: col1W, transition: 'width 0.25s ease', overflow: 'hidden' }}
          className="flex-shrink-0 h-full">
          <div className="h-full" style={{ paddingRight: showCol2 ? '6px' : '0' }}>
            <Column title="Productos" items={productos} isLoading={loadingProductos}
              selectedId={selectedProducto?.id ?? null}
              onSelect={(p) => { setSelectedProducto(p); setSelectedVariedad(null); setAddingVariedad(false); setEditingVariedad(null); }}
              onAdd={() => { setEditingProducto(null); setAddingProducto(true); }}
              onEdit={(p) => { setEditingProducto(p as Producto); setAddingProducto(false); }}
              onDelete={(p) => setConfirmDelete({ type: 'producto', item: p })}
              onDarBaja={(p) => setBajaItem({ type: 'producto', item: p })}
              onDarAlta={(p) => darAlta.mutate({ type: 'producto', id: p.id })}
              onVerMotivo={(p) => setMotivoItem(p)}
              addingNew={addingProducto} editingId={editingProducto?.id ?? null}
              addPlaceholder="Ej: BELLANDES"
              onSaveNew={(n) => saveProducto.mutate(n)} onCancelNew={() => setAddingProducto(false)}
              onSaveEdit={(n) => saveProducto.mutate(n)} onCancelEdit={() => setEditingProducto(null)}
              isSavingNew={saveProducto.isPending && !editingProducto}
              isSavingEdit={saveProducto.isPending && !!editingProducto}
              emptyText="Sin productos. Agrega el primero." hasArrow />
          </div>
        </div>

        {/* Separador 1→2 */}
        <div style={{
          width: showCol2 ? '24px' : '0px',
          transition: 'width 0.25s ease, opacity 0.2s ease',
          opacity: showCol2 ? 1 : 0,
          overflow: 'hidden', flexShrink: 0,
        }} className="flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-carbon-400" />
        </div>

        {/* Columna 2 — Variedades */}
        <div style={{
          width: col2W, transition: 'width 0.25s ease, opacity 0.2s ease',
          opacity: showCol2 ? 1 : 0, overflow: 'hidden', flexShrink: 0,
        }} className="h-full">
          <div className="h-full" style={{ paddingRight: showCol3 ? '6px' : '0' }}>
            <Column title="Variedades"
              subtitle={selectedProducto ? `de ${selectedProducto.nombre}` : undefined}
              items={selectedProducto ? variedades : []} isLoading={!!selectedProducto && loadingVariedades}
              selectedId={selectedVariedad?.id ?? null}
              onSelect={(v) => { setSelectedVariedad(v as Variedad); setColorModal({ open: false, edit: null }); }}
              onAdd={() => { setEditingVariedad(null); setAddingVariedad(true); }}
              onEdit={(v) => { setEditingVariedad(v as Variedad); setAddingVariedad(false); }}
              onDelete={(v) => setConfirmDelete({ type: 'variedad', item: v })}
              onDarBaja={(v) => setBajaItem({ type: 'variedad', item: v })}
              onDarAlta={(v) => darAlta.mutate({ type: 'variedad', id: v.id })}
              onVerMotivo={(v) => setMotivoItem(v)}
              addingNew={addingVariedad} editingId={editingVariedad?.id ?? null}
              addPlaceholder="Ej: FREEDOM"
              onSaveNew={(n) => saveVariedad.mutate(n)} onCancelNew={() => setAddingVariedad(false)}
              onSaveEdit={(n) => saveVariedad.mutate(n)} onCancelEdit={() => setEditingVariedad(null)}
              isSavingNew={saveVariedad.isPending && !editingVariedad}
              isSavingEdit={saveVariedad.isPending && !!editingVariedad}
              emptyText="Sin variedades. Agrega la primera." hasArrow />
          </div>
        </div>

        {/* Separador 2→3 */}
        <div style={{
          width: showCol3 ? '24px' : '0px',
          transition: 'width 0.25s ease, opacity 0.2s ease',
          opacity: showCol3 ? 1 : 0,
          overflow: 'hidden', flexShrink: 0,
        }} className="flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-carbon-400" />
        </div>

        {/* Columna 3 — Colores (definiciones productivas) */}
        <div style={{
          width: col3W, transition: 'width 0.25s ease, opacity 0.2s ease',
          opacity: showCol3 ? 1 : 0, overflow: 'hidden', flexShrink: 0,
        }} className="h-full">
          <Column title="Colores"
            subtitle={selectedVariedad ? `de ${selectedVariedad.nombre}` : undefined}
            items={selectedVariedad ? colores : []} isLoading={!!selectedVariedad && loadingColores}
            selectedId={null} onSelect={() => {}}
            onAdd={openNewColor}
            onEdit={(c) => openEditColor(c as Color)}
            onDelete={(c) => setConfirmDelete({ type: 'color', item: c })}
            onDarBaja={(c) => setBajaItem({ type: 'color', item: c })}
            onDarAlta={(c) => darAlta.mutate({ type: 'color', id: c.id })}
            onVerMotivo={(c) => setMotivoItem(c)}
            addingNew={false} editingId={null}
            addPlaceholder="Color"
            onSaveNew={() => {}} onCancelNew={() => {}}
            onSaveEdit={() => {}} onCancelEdit={() => {}}
            isSavingNew={false} isSavingEdit={false}
            emptyText="Sin colores. Agrega el primero."
            inline={false} metaOf={(c) => colorMeta(c as Color)} />
        </div>

      </div>

      {colorModal.open && (
        <ColorModal
          initial={colorModal.edit}
          onSave={(values) => saveColor.mutate(values)}
          onCancel={() => setColorModal({ open: false, edit: null })}
          isPending={saveColor.isPending}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar definitivamente ${TIPO_LABEL[confirmDelete.type]} "${confirmDelete.item.nombre}"?`}
          description="Se borrará permanentemente de la base de datos. Esta acción no se puede deshacer."
          confirmLabel="Eliminar definitivamente"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          isPending={removeProducto.isPending || removeVariedad.isPending || removeColor.isPending}
        />
      )}

      {bajaItem && (
        <BajaModal
          tipo={TIPO_LABEL[bajaItem.type]}
          nombre={bajaItem.item.nombre}
          onConfirm={(motivo) => darBaja.mutate({ type: bajaItem.type, id: bajaItem.item.id, motivoBaja: motivo })}
          onCancel={() => setBajaItem(null)}
          isPending={darBaja.isPending}
        />
      )}

      {motivoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(16,24,40,0.5)' }} onClick={() => setMotivoItem(null)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-semibold text-carbon-50">Motivo de desactivación</h3>
              <button onClick={() => setMotivoItem(null)}
                className="w-7 h-7 rounded-md hover:bg-surface-overlay flex items-center justify-center text-carbon-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-carbon-400 mb-1.5">&quot;{motivoItem.nombre}&quot;</p>
            {motivoItem.motivoBaja ? (
              <p className="text-sm text-carbon-200 whitespace-pre-wrap">{motivoItem.motivoBaja}</p>
            ) : (
              <p className="text-sm text-carbon-400 italic">No se registró un motivo.</p>
            )}
            <div className="flex justify-end mt-5">
              <button onClick={() => setMotivoItem(null)} className="btn-ghost text-sm px-4 py-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
