import { useParams, useNavigate } from 'react-router';
import { MATERI_LIST, STAGE_LABELS } from '../data/curriculum';
import { KinestheticSimulator } from '../components/KinestheticSimulator';

export default function SimulasiPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const materiId = Number(id);
  const materi = MATERI_LIST.find((m) => m.id === materiId);

  if (!materi) return <div className="p-6 text-red-500">Materi tidak ditemukan.</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <div className="text-xs text-[#464555] mb-1 uppercase tracking-widest font-semibold">
          Materi {materiId} · {STAGE_LABELS.simulasi}
        </div>
        <h1 className="text-2xl font-bold text-[#121c2c]">{materi.judul}</h1>
        <p className="text-sm text-[#464555] mt-1 leading-relaxed">
          Simulasi kinestetik berpasangan untuk melatih dekomposisi instruksi dan pemahaman variabel
          sebelum pengkodean di komputer.
        </p>
      </div>

      <KinestheticSimulator
        materiId={materiId}
        onComplete={() => navigate('/beranda')}
      />
    </div>
  );
}
