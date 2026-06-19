import { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Scale, Check, ChevronDown } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';
import type { Judge } from '@/types';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  label: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}

function MultiSelect({ label, options, value, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };
  return (
    <div>
      <label className="label-base">{label}</label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)}
          className="input-base flex items-center justify-between text-left">
          <span className="truncate text-navy-400">
            {value.length > 0 ? `已选 ${value.length} 项` : '请选择'}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-navy-200 bg-white py-1 shadow-card scroll-thin">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-navy-400">暂无选项</div>
            ) : options.map((opt) => (
              <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50">
                <div className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  value.includes(opt.id) ? 'border-navy-600 bg-gradient-navy text-white' : 'border-navy-300 bg-white',
                )}>
                  {value.includes(opt.id) && <Check className="h-3 w-3" />}
                </div>
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface JudgeFormState {
  name: string; institution: string; title: string;
  avoidTeams: string[]; avoidInstitutions: string[]; avoidPlayers: string[];
}

const emptyForm: JudgeFormState = { name: '', institution: '', title: '', avoidTeams: [], avoidInstitutions: [], avoidPlayers: [] };

export default function JudgesPage() {
  const { judges, teams, addJudge, updateJudge, removeJudge } = useDebateStore();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JudgeFormState>(emptyForm);

  const teamOptions = useMemo(
    () => teams.filter((t) => !t.id.startsWith('__')).map((t) => ({ id: t.id, label: t.name })), [teams],
  );
  const institutionOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.institution));
    return Array.from(set).map((inst) => ({ id: inst, label: inst }));
  }, [teams]);
  const playerOptions = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    teams.forEach((t) => t.players.forEach((p) => list.push({ id: p.id, label: `${p.name}（${t.name}）` })));
    return list;
  }, [teams]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return judges;
    return judges.filter((j) =>
      j.name.toLowerCase().includes(kw) || j.institution.toLowerCase().includes(kw),
    );
  }, [judges, keyword]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (j: Judge) => {
    setEditingId(j.id);
    setForm({
      name: j.name, institution: j.institution, title: j.title ?? '',
      avoidTeams: [...j.avoidTeams], avoidInstitutions: [...j.avoidInstitutions], avoidPlayers: [...j.avoidPlayers],
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.institution.trim()) return;
    const payload = {
      name: form.name.trim(), institution: form.institution.trim(),
      title: form.title.trim() || undefined,
      avoidTeams: form.avoidTeams, avoidInstitutions: form.avoidInstitutions, avoidPlayers: form.avoidPlayers,
    };
    editingId ? updateJudge(editingId, payload) : addJudge(payload);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-navy text-white shadow-card">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy-900">评委管理</h2>
            <p className="text-sm text-navy-500">共 {judges.length} 位评委</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" />新增评委
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名或所属机构..." className="input-base pl-10" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty title={keyword ? '未找到匹配的评委' : '暂无评委'}
            description={keyword ? '请尝试其他关键词' : '点击右上角按钮添加第一位评委'} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-left text-navy-700">
                  <th className="px-5 py-3 font-semibold">姓名</th>
                  <th className="px-5 py-3 font-semibold">所属机构</th>
                  <th className="px-5 py-3 font-semibold">职称</th>
                  <th className="px-5 py-3 font-semibold">回避队伍</th>
                  <th className="px-5 py-3 font-semibold">回避机构</th>
                  <th className="px-5 py-3 font-semibold">回避选手</th>
                  <th className="px-5 py-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j, idx) => (
                  <tr key={j.id} className={cn(
                    'border-t border-navy-100 transition-colors hover:bg-ivory-50',
                    idx % 2 === 1 && 'bg-ivory-50/40',
                  )}>
                    <td className="px-5 py-3.5 font-medium text-navy-900">{j.name}</td>
                    <td className="px-5 py-3.5 text-navy-700">{j.institution}</td>
                    <td className="px-5 py-3.5 text-navy-600">{j.title || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge-blue"><Check className="h-3 w-3" />{j.avoidTeams.length}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-gold"><Check className="h-3 w-3" />{j.avoidInstitutions.length}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-green"><Check className="h-3 w-3" />{j.avoidPlayers.length}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(j)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-700" aria-label="编辑">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => removeJudge(j.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="删除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingId ? '编辑评委' : '新增评委'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">取消</button>
          <button onClick={handleSubmit} className="btn-primary"
            disabled={!form.name.trim() || !form.institution.trim()}>
            {editingId ? '保存修改' : '确认添加'}
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label-base">姓名</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="请输入评委姓名" className="input-base" />
          </div>
          <div>
            <label className="label-base">所属机构</label>
            <input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder="请输入所属机构" className="input-base" />
          </div>
          <div>
            <label className="label-base">职称</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="教授 / 副教授 / 研究员等" className="input-base" />
          </div>
          <div className="border-t border-navy-100 pt-4">
            <h4 className="mb-3 text-sm font-semibold text-navy-800">回避配置</h4>
            <div className="space-y-3.5">
              <MultiSelect label="回避队伍" options={teamOptions} value={form.avoidTeams}
                onChange={(v) => setForm({ ...form, avoidTeams: v })} />
              <MultiSelect label="回避机构" options={institutionOptions} value={form.avoidInstitutions}
                onChange={(v) => setForm({ ...form, avoidInstitutions: v })} />
              <MultiSelect label="回避选手" options={playerOptions} value={form.avoidPlayers}
                onChange={(v) => setForm({ ...form, avoidPlayers: v })} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
