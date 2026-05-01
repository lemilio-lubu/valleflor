'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Check, X, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Producto { id: string; nombre: string; }
interface Variedad { id: string; nombre: string; productoId: string; }
interface Color { id: string; nombre: string; variedadId: string; }
type ConfirmItem = { type: 'producto' | 'variedad' | 'color'; item: Producto | Variedad | Color };

// ─── Inline input ──────────────────────────────────────────────────────────
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

// ─── Column ────────────────────────────────────────────────────────────────
function Column<T extends { id: string; nombre: string }>({
  title, subtitle, items, isLoading, selectedId, onSelect,
  onAdd, onEdit, onDelete, addingNew, editingId, addPlaceholder,
  onSaveNew, onCancelNew, onSaveEdit, onCancelEdit,
  isSavingNew, isSavingEdit, emptyText, hasArrow = false,
}: {
  title: string; subtitle?: string; items: T[]; isLoading?: boolean;
  selectedId: string | null; onSelect: (item: T) => void;
  onAdd: () => void; onEdit: (item: T) => void; onDelete: (item: T) => void;
  addingNew: boolean; editingId: string | null; addPlaceholder: string;
  onSaveNew: (n: string) => void; onCancelNew: () => void;
  onSaveEdit: (n: string) => void; onCancelEdit: () => void;
  isSavingNew: boolean; isSavingEdit: boolean; emptyText: string; hasArrow?: boolean;
}) {
  return (
    <div className="flex flex-col h-full border border-surface-border rounded-xl overflow-hidden bg-surface-raised">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-border bg-surface-overlay/40 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-carbon-50">{title}</h3>
            {subtitle && <p className="text-[11px] text-carbon-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <span className="text-[11px] text-carbon-400 bg-surface-overlay rounded-full px-2 py-0.5 flex-shrink-0">
            {items.length}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="p-3 space-y-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-surface-overlay rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && items.length === 0 && !addingNew && (
          <div className="flex items-center justify-center h-full py-10 px-4">
            <p className="text-carbon-400 text-xs text-center">{emptyText}</p>
          </div>
        )}
        {!isLoading && items.map((item) => {
          const isSelected = selectedId === item.id;
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} onClick={() => !isEditing && onSelect(item)}
              className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-surface-border/30 last:border-0 transition-all border-l-2 ${
                isSelected ? 'bg-verde-50 border-l-verde-600' : 'hover:bg-surface-overlay/50 border-l-transparent'
              }`}>
              {isEditing ? (
                <div className="flex-1 min-w-0">
                  <InlineInput initialValue={item.nombre} placeholder={addPlaceholder}
                    onSave={onSaveEdit} onCancel={onCancelEdit} isPending={isSavingEdit} />
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm truncate ${isSelected ? 'text-verde-700 font-medium' : 'text-carbon-50'}`}>
                    {item.nombre}
                  </span>
                  <div className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity ${isSelected || true ? '' : ''} opacity-0 group-hover:opacity-100`}>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                      className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-verde-600 hover:bg-verde-50 transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      className="w-6 h-6 rounded flex items-center justify-center text-carbon-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
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
      <div className="px-3 py-2.5 border-t border-surface-border flex-shrink-0">
        {addingNew ? (
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
export function CatalogoProductos({ fincaId }: { fincaId: string }) {
  const qc = useQueryClient();

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [selectedVariedad, setSelectedVariedad] = useState<Variedad | null>(null);

  const [addingProducto, setAddingProducto] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [addingVariedad, setAddingVariedad] = useState(false);
  const [editingVariedad, setEditingVariedad] = useState<Variedad | null>(null);
  const [addingColor, setAddingColor] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmItem | null>(null);

  const showCol2 = !!selectedProducto;
  const showCol3 = !!selectedVariedad;

  // Widths: descontar separadores (24px c/u) del ancho total de columnas
  const col1W = showCol3 ? 'calc(33.33% - 16px)' : showCol2 ? 'calc(50% - 12px)' : '100%';
  const col2W = showCol3 ? 'calc(33.33% - 16px)' : showCol2 ? 'calc(50% - 12px)' : '0%';
  const col3W = showCol3 ? 'calc(33.33% - 16px)' : '0%';

  // Queries
  const { data: productos = [], isLoading: loadingProductos } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => api.get('/productos', { params: { fincaId } }).then((r) => r.data),
  });
  const { data: variedades = [], isLoading: loadingVariedades } = useQuery<Variedad[]>({
    queryKey: ['variedades', selectedProducto?.id],
    queryFn: () => api.get('/variedades', { params: { productoId: selectedProducto!.id } }).then((r) => r.data),
    enabled: !!selectedProducto,
  });
  const { data: colores = [], isLoading: loadingColores } = useQuery<Color[]>({
    queryKey: ['colores', selectedVariedad?.id],
    queryFn: () => api.get('/colores', { params: { variedadId: selectedVariedad!.id } }).then((r) => r.data),
    enabled: !!selectedVariedad,
  });

  // Mutations — Productos
  const saveProducto = useMutation({
    mutationFn: (nombre: string) =>
      editingProducto ? api.patch(`/productos/${editingProducto.id}`, { nombre }) : api.post('/productos', { nombre, fincaId }),
    onSuccess: (res, nombre) => {
      qc.invalidateQueries({ queryKey: ['productos', fincaId] });
      toast.success(editingProducto ? `Producto "${nombre}" actualizado` : `Producto "${nombre}" creado`);
      if (!editingProducto) setSelectedProducto(res.data);
      setAddingProducto(false); setEditingProducto(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });
  const removeProducto = useMutation({
    mutationFn: (id: string) => api.delete(`/productos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos', fincaId] });
      toast.success(`Producto "${confirmDelete?.item.nombre}" eliminado`);
      if (selectedProducto?.id === confirmDelete?.item.id) { setSelectedProducto(null); setSelectedVariedad(null); }
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  // Mutations — Variedades
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
      qc.invalidateQueries({ queryKey: ['variedades', selectedProducto?.id] });
      toast.success(`Variedad "${confirmDelete?.item.nombre}" eliminada`);
      if (selectedVariedad?.id === confirmDelete?.item.id) setSelectedVariedad(null);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  // Mutations — Colores
  const saveColor = useMutation({
    mutationFn: (nombre: string) =>
      editingColor ? api.patch(`/colores/${editingColor.id}`, { nombre }) : api.post('/colores', { nombre, variedadId: selectedVariedad!.id }),
    onSuccess: (_, nombre) => {
      qc.invalidateQueries({ queryKey: ['colores', selectedVariedad?.id] });
      toast.success(editingColor ? `Color "${nombre}" actualizado` : `Color "${nombre}" creado`);
      setAddingColor(false); setEditingColor(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });
  const removeColor = useMutation({
    mutationFn: (id: string) => api.delete(`/colores/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['colores', selectedVariedad?.id] });
      toast.success(`Color "${confirmDelete?.item.nombre}" eliminado`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  function handleDeleteConfirm() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'producto') removeProducto.mutate(confirmDelete.item.id);
    else if (confirmDelete.type === 'variedad') removeVariedad.mutate(confirmDelete.item.id);
    else removeColor.mutate(confirmDelete.item.id);
  }

  return (
    <>
      <div className="flex gap-0 overflow-hidden" style={{ height: '420px' }}>

        {/* Columna 1 — Productos */}
        <div style={{ width: col1W, transition: 'width 0.25s ease', overflow: 'hidden' }}
          className="flex-shrink-0 h-full pr-0">
          <div className="h-full" style={{ paddingRight: showCol2 ? '6px' : '0' }}>
            <Column title="Productos" items={productos} isLoading={loadingProductos}
              selectedId={selectedProducto?.id ?? null}
              onSelect={(p) => { setSelectedProducto(p); setSelectedVariedad(null); setAddingVariedad(false); setEditingVariedad(null); }}
              onAdd={() => { setEditingProducto(null); setAddingProducto(true); }}
              onEdit={(p) => { setEditingProducto(p as Producto); setAddingProducto(false); }}
              onDelete={(p) => setConfirmDelete({ type: 'producto', item: p })}
              addingNew={addingProducto} editingId={editingProducto?.id ?? null}
              addPlaceholder="Ej: ROSAS"
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
          <ChevronRight className="w-4 h-4 text-verde-400" />
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
              onSelect={(v) => { setSelectedVariedad(v as Variedad); setAddingColor(false); setEditingColor(null); }}
              onAdd={() => { setEditingVariedad(null); setAddingVariedad(true); }}
              onEdit={(v) => { setEditingVariedad(v as Variedad); setAddingVariedad(false); }}
              onDelete={(v) => setConfirmDelete({ type: 'variedad', item: v })}
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
          <ChevronRight className="w-4 h-4 text-verde-400" />
        </div>

        {/* Columna 3 — Colores */}
        <div style={{
          width: col3W, transition: 'width 0.25s ease, opacity 0.2s ease',
          opacity: showCol3 ? 1 : 0, overflow: 'hidden', flexShrink: 0,
        }} className="h-full">
          <Column title="Colores"
            subtitle={selectedVariedad ? `de ${selectedVariedad.nombre}` : undefined}
            items={selectedVariedad ? colores : []} isLoading={!!selectedVariedad && loadingColores}
            selectedId={null} onSelect={() => {}}
            onAdd={() => { setEditingColor(null); setAddingColor(true); }}
            onEdit={(c) => { setEditingColor(c as Color); setAddingColor(false); }}
            onDelete={(c) => setConfirmDelete({ type: 'color', item: c })}
            addingNew={addingColor} editingId={editingColor?.id ?? null}
            addPlaceholder="Ej: ROJO OSCURO"
            onSaveNew={(n) => saveColor.mutate(n)} onCancelNew={() => setAddingColor(false)}
            onSaveEdit={(n) => saveColor.mutate(n)} onCancelEdit={() => setEditingColor(null)}
            isSavingNew={saveColor.isPending && !editingColor}
            isSavingEdit={saveColor.isPending && !!editingColor}
            emptyText="Sin colores. Agrega el primero." />
        </div>

      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar ${confirmDelete.type === 'producto' ? 'el producto' : confirmDelete.type === 'variedad' ? 'la variedad' : 'el color'} "${confirmDelete.item.nombre}"?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          isPending={removeProducto.isPending || removeVariedad.isPending || removeColor.isPending}
        />
      )}
    </>
  );
}
