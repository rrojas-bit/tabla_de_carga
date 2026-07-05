"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { procesarDocumento } from "@/app/(dashboard)/importador/actions";
import type { ExtraccionDocumento } from "@/lib/ai/extract";

type EstadoArchivo = "subiendo" | "leyendo" | "listo" | "error";

type ArchivoItem = {
  id: string;
  nombre: string;
  estado: EstadoArchivo;
  error?: string;
};

type Props = {
  empresaId: string;
  onDocumentoSubido: (documentoId: string) => void;
  onExtraccion: (extraccion: ExtraccionDocumento) => void;
};

const MIME_ACEPTADOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

export default function SubirDocumentos({
  empresaId,
  onDocumentoSubido,
  onExtraccion,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);

  function actualizar(id: string, cambios: Partial<ArchivoItem>) {
    setArchivos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...cambios } : a))
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const tempId = crypto.randomUUID();

      if (!MIME_ACEPTADOS.has(file.type)) {
        setArchivos((prev) => [
          ...prev,
          {
            id: tempId,
            nombre: file.name,
            estado: "error",
            error: "Formato no soportado — usa PDF, JPG, PNG o WEBP",
          },
        ]);
        continue;
      }

      if (file.size > TAMANO_MAXIMO) {
        setArchivos((prev) => [
          ...prev,
          {
            id: tempId,
            nombre: file.name,
            estado: "error",
            error: "El archivo supera 10 MB",
          },
        ]);
        continue;
      }

      setArchivos((prev) => [
        ...prev,
        { id: tempId, nombre: file.name, estado: "subiendo" },
      ]);

      const path = `${empresaId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        actualizar(tempId, {
          estado: "error",
          error: "No se pudo subir el archivo",
        });
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("documentos_carga")
        .insert({
          empresa_id: empresaId,
          storage_path: path,
          nombre_archivo: file.name,
          mime_type: file.type,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        actualizar(tempId, {
          estado: "error",
          error: "No se pudo registrar el documento",
        });
        continue;
      }

      const documentoId = inserted.id as string;
      onDocumentoSubido(documentoId);

      setArchivos((prev) =>
        prev.map((a) =>
          a.id === tempId ? { ...a, id: documentoId, estado: "leyendo" } : a
        )
      );

      const result = await procesarDocumento(documentoId);

      if (result?.error) {
        actualizar(documentoId, { estado: "error", error: result.error });
        continue;
      }

      if (result?.extraccion) {
        onExtraccion(result.extraccion);
      }

      actualizar(documentoId, { estado: "listo" });
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="mb-4 p-4 bg-teal-50/40 border border-teal-100 rounded-lg">
      <div className="flex items-start gap-3">
        <i className="ti ti-file-text text-teal-500 text-xl mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-gray-800">
            ¿Tienes la DUCA o factura? Súbela y llenamos el formulario por ti
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            PDF, JPG, PNG o WEBP — puedes subir varios (DUCA, factura, BL)
          </p>
          <label className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white border border-teal-200 rounded-md text-[12px] font-medium text-teal-600 cursor-pointer hover:bg-teal-50 transition-colors">
            <i className="ti ti-upload" />
            Subir documentos
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
      </div>

      {archivos.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {archivos.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-[12px]">
              {a.estado === "subiendo" && (
                <i className="ti ti-loader-2 animate-spin text-gray-400" />
              )}
              {a.estado === "leyendo" && (
                <i className="ti ti-loader-2 animate-spin text-teal-500" />
              )}
              {a.estado === "listo" && (
                <i className="ti ti-circle-check text-teal-500" />
              )}
              {a.estado === "error" && (
                <i className="ti ti-alert-circle text-coral-500" />
              )}
              <span className="text-gray-600 truncate max-w-[220px]">
                {a.nombre}
              </span>
              <span className="text-gray-400">
                {a.estado === "subiendo" && "Subiendo…"}
                {a.estado === "leyendo" && "Leyendo documento…"}
                {a.estado === "listo" && "Listo — revisa los campos"}
                {a.estado === "error" && (a.error ?? "Error")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
