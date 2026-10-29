import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Calendar, Clock, MapPin, User, Briefcase, Camera, Send, Edit, Check, X, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type TipoTurno = 'MAÑANA' | 'TARDE' | 'NOCHE' | 'DESCANSO';

interface TurnoInfo {
  tipo: TipoTurno;
  horario: string;
}

interface FormData {
  turno: string;
  horario: string;
  fecha: string;
  hora: string;
  lugar: string;
  operador: string;
  supervisor: string;
  roper: string;
  ocurrencia: string;
  nota: string;
}

function calcularTurno(fechaStr: string): TurnoInfo {
  const fechaInicio = new Date('2026-10-23');
  const fechaActual = new Date(fechaStr);
  const diffTime = fechaActual.getTime() - fechaInicio.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { tipo: 'MAÑANA', horario: '06:00 - 14:00' };
  
  const diaDelCiclo = diffDays % 8;
  if (diaDelCiclo <= 1) return { tipo: 'MAÑANA', horario: '06:00 - 14:00' };
  if (diaDelCiclo <= 3) return { tipo: 'TARDE', horario: '14:00 - 22:00' };
  if (diaDelCiclo <= 5) return { tipo: 'NOCHE', horario: '22:00 - 06:00' };
  return { tipo: 'DESCANSO', horario: '--:--' };
}

function obtenerHoraActual(): string {
  const ahora = new Date();
  const horas = ahora.getHours().toString().padStart(2, '0');
  const minutos = ahora.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
}

export default function ReporteForm() {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const turnoInicial = calcularTurno(fechaHoy);

  const [ocurrenciaEditable, setOcurrenciaEditable] = useState(false);
  const [notaEditable, setNotaEditable] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    turno: turnoInicial.tipo,
    horario: turnoInicial.horario,
    fecha: fechaHoy,
    hora: obtenerHoraActual(),
    lugar: 'CEMO NORTE',
    operador: 'OLIVA BURGOS JUAN GREGORY',
    supervisor: '',
    roper: '',
    ocurrencia: `SE PROCEDE CON EL RELEVO, CONSIGNAS Y NOVEDADES CORRESPONDIENTES DEL TURNO SALIENTE. ASÍ MISMO, CON EL ÁREA DEBIDAMENTE LIMPIA DE IGUAL MANERA SE REALIZA EL MANTENIMIENTO, DESINFECCIÓN DEL MOBILIARIO, ES TODO CUANTO TENGO QUE INFORMAR PARA LOS FINES QUE ESTIME CONVENIENTE.`,
    nota: `SE RECEPCIONA LOS SIGUIENTES CARGOS:\n- 1 CARGADOR DE HANDY\n- 1 de MOTOROLA (50666)\n- 1 RADIO MOTOROLA MTP850 S\n- QUE ESTA FUERA DE SERVICIO CON SU CARGADOR DE MESA, MODELO PSM4250A`,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleOcurrencia = () => setOcurrenciaEditable(!ocurrenciaEditable);
  const toggleNota = () => setNotaEditable(!notaEditable);

  const handleFotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const archivos = Array.from(e.target.files);
      setFotos([...fotos, ...archivos]);
      const nuevasPreviews = archivos.map(file => URL.createObjectURL(file));
      setPreviews([...previews, ...nuevasPreviews]);
    }
  };

  const eliminarFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const abrirExplorador = () => fileInputRef.current?.click();

  const handleEnviarWhatsApp = () => {
    const fechaFormateada = formData.fecha.split('-').reverse().join('/');
    const mensaje = `TURNO: ${formData.turno}
FECHA: ${fechaFormateada}
HORA: ${formData.hora}
LUGAR: ${formData.lugar}
OPERADOR: ${formData.operador}
SUPERVISOR: ${formData.supervisor}
ROPER: ${formData.roper}

OCURRENCIA:
${formData.ocurrencia}

NOTA:
${formData.nota}

SE ADJUNTA ${fotos.length} FOTO${fotos.length !== 1 ? 'S' : ''}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
    if (fotos.length > 0) {
      alert(`✅ Reporte enviado. Adjunta las ${fotos.length} foto(s) manualmente.`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header Premium */}
      <header className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">HERACLES</h1>
                  <p className="text-blue-200 text-sm font-medium">Sistema de Reportes</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
              <span className="text-sm font-semibold text-blue-100">v1.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Badge de Turno */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 font-semibold">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Turno: {formData.turno} • {formData.horario}
        </div>

        {/* Grid de Información */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Datos del Turno */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Datos del Turno
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow icon={Calendar} label="Fecha" value={formData.fecha} />
              <InfoRow icon={Clock} label="Hora" value={formData.hora} />
              <InfoRow icon={MapPin} label="Lugar" value={formData.lugar} />
            </div>
          </section>

          {/* Personal */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Personal Asignado
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow icon={User} label="Operador" value={formData.operador} />
              <InputField
                icon={Briefcase}
                label="Supervisor"
                name="supervisor"
                value={formData.supervisor}
                onChange={handleChange}
                placeholder="Nombre del supervisor"
              />
              <InputField
                icon={Briefcase}
                label="Roper"
                name="roper"
                value={formData.roper}
                onChange={handleChange}
                placeholder="N° o Ubicación"
              />
            </div>
          </section>
        </div>

        {/* Ocurrencia y Nota */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Edit className="w-5 h-5 text-emerald-600" />
              Detalles del Reporte
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <EditableField
              label="Ocurrencia"
              value={formData.ocurrencia}
              onChange={(value: string) => setFormData({...formData, ocurrencia: value})}
              isEditable={ocurrenciaEditable}
              onToggle={toggleOcurrencia}
              rows={5}
            />
            <EditableField
              label="Nota / Cargos"
              value={formData.nota}
              onChange={(value: string) => setFormData({...formData, nota: value})}
              isEditable={notaEditable}
              onToggle={toggleNota}
              rows={6}
              isCode
            />
          </div>
        </section>

        {/* Fotos */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-rose-600" />
              Evidencia Fotográfica
            </h2>
          </div>
          <div className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={abrirExplorador}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
              </div>
              <p className="font-semibold text-slate-700 group-hover:text-blue-700">Adjuntar fotos</p>
              <p className="text-sm text-slate-500 mt-1">Selecciona imágenes del explorador</p>
            </button>

            {previews.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => eliminarFoto(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Botón de Envío */}
        <button
          type="button"
          onClick={handleEnviarWhatsApp}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-5 px-8 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 flex items-center justify-center gap-3 group"
        >
          <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          Enviar por WhatsApp
        </button>
      </main>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

interface InfoRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-base font-semibold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

interface InputFieldProps {
  icon: LucideIcon;
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

function InputField({ icon: Icon, label, name, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
        />
      </div>
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditable: boolean;
  onToggle: () => void;
  rows: number;
  isCode?: boolean;
}

function EditableField({ label, value, onChange, isEditable, onToggle, rows, isCode = false }: EditableFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggle}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            isEditable
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isEditable ? <Check className="w-4 h-4 inline mr-1" /> : <Edit className="w-4 h-4 inline mr-1" />}
          {isEditable ? 'Listo' : 'Editar'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        readOnly={!isEditable}
        rows={rows}
        className={`w-full p-4 rounded-xl border border-slate-200 resize-none transition-all ${
          isEditable
            ? 'bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none'
            : 'bg-slate-50 text-slate-600 cursor-not-allowed'
        } ${isCode ? 'font-mono text-sm' : 'font-medium'}`}
      />
    </div>
  );
}