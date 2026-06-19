import { useState, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, Check, ChevronDown, Star } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';
import type { Topic, TopicCategory, DebateFormat } from '@/types';
import { FORMAT_RULES } from '@/engines/formatRules';
import { cn } from '@/lib/utils';

const CATEGORIES: TopicCategory[] = ['政策', '价值', '事实', '模拟法庭'];
const CATEGORY_COLORS: Record<TopicCategory, string> = {
  政策: 'badge-blue', 价值: 'badge-gold', 事实: 'badge-green', 模拟法庭: 'badge-red',
};
const DIFFICULTY_COLORS: Record<TopicCategory, string> = {
  政策: 'bg-navy-50 text-navy-700 ring-navy-600/20',
  价值: 'bg-gold-50 text-gold-700 ring-gold-600/30',
  事实: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  模拟法庭: 'bg-red-50 text-red-700 ring-red-600/20',
};
const FORMAT_LIST: DebateFormat[] = ['parliamentary', 'mandarin', 'moot_court', 'british_parliamentary'];

interface ChipFilterProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}
function ChipFilter({ label, options, value, onChange }: ChipFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-navy-600">{label}：</span>
      <button onClick={() => onChange('')} className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-all',
        value === '' ? 'bg-gradient-navy text-white shadow-card' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50',
      )}>全部</button>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)} className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-all',
          value === opt ? 'bg-gradient-navy text-white shadow-card' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50',
        )}>{opt}</button>
      ))}
    </div>
  );
}

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
          <span className="truncate text-navy-400">{value.length > 0 ? `已选 ${value.length} 项` : '请选择'}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-navy-200 bg-white py-1 shadow-card scroll-thin">
            {options.map((opt) => (
              <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-navy-700 hover:bg-navy-50">
                <div className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  value.includes(opt.id) ? 'border-navy-600 bg-gradient-navy text-white' : 'border-navy-300 bg-white')}>
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

function Stars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('h-4 w-4',
          i < level ? 'fill-gold-400 text-gold-400' : 'text-navy-200')} />
      ))}
    </div>
  );
}

interface TopicFormState {
  title: string; proSide: string; conSide: string;
  category: TopicCategory[]; formats: DebateFormat[]; difficulty: 1 | 2 | 3 | 4 | 5;
}

const emptyForm: TopicFormState = { title: '', proSide: '', conSide: '', category: [], formats: [], difficulty: 3 };

export default function TopicsPage() {
  const { topics, addTopic, updateTopic, removeTopic } = useDebateStore();
  const [keyword, setKeyword] = useState('');
  const [catFilter, setCatFilter] = useState<TopicCategory | ''>('');
  const [fmtFilter, setFmtFilter] = useState<DebateFormat | ''>('');
  const [diffFilter, setDiffFilter] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TopicFormState>(emptyForm);

  const categoryOptions = CATEGORIES.map((c) => ({ id: c, label: c }));
  const formatOptions = FORMAT_LIST.map((f) => ({ id: f, label: FORMAT_RULES[f].label }));

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return topics.filter((t) => {
      if (kw && !t.title.toLowerCase().includes(kw)) return false;
      if (catFilter && !t.category.includes(catFilter)) return false;
      if (fmtFilter && !t.formats.includes(fmtFilter)) return false;
      if (diffFilter !== '' && t.difficulty !== diffFilter) return false;
      return true;
    });
  }, [topics, keyword, catFilter, fmtFilter, diffFilter]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: Topic) => {
    setEditingId(t.id);
    setForm({
      title: t.title, proSide: t.proSide, conSide: t.conSide,
      category: [...t.category], formats: [...t.formats], difficulty: t.difficulty,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.proSide.trim() || !form.conSide.trim()) return;
    if (form.category.length === 0 || form.formats.length === 0) return;
    const payload = {
      title: form.title.trim(), proSide: form.proSide.trim(), conSide: form.conSide.trim(),
      category: form.category, formats: form.formats, difficulty: form.difficulty,
    };
    editingId ? updateTopic(editingId, payload) : addTopic(payload);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-navy text-white shadow-card">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy-900">辩题库管理</h2>
            <p className="text-sm text-navy-500">共 {topics.length} 道辩题</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" />新增辩题
        </button>
      </div>

      <div className="card space-y-4 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索辩题标题..." className="input-base pl-10" />
        </div>
        <ChipFilter label="分类" options={CATEGORIES} value={catFilter} onChange={(v) => setCatFilter(v as TopicCategory | '')} />
        <ChipFilter label="赛制" options={FORMAT_LIST.map((f) => FORMAT_RULES[f].label)}
          value={fmtFilter ? FORMAT_RULES[fmtFilter].label : ''}
          onChange={(v) => setFmtFilter(v ? (FORMAT_LIST.find((f) => FORMAT_RULES[f].label === v) as DebateFormat) : '')} />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-navy-600">难度：</span>
          <button onClick={() => setDiffFilter('')} className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-all',
            diffFilter === '' ? 'bg-gradient-navy text-white shadow-card' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50',
          )}>全部</button>
          {[1, 2, 3, 4, 5].map((d) => (
            <button key={d} onClick={() => setDiffFilter(diffFilter === d ? '' : d)} className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-all',
              diffFilter === d ? 'bg-gradient-navy text-white shadow-card' : 'bg-white text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50',
            )}>★{d}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty title={keyword || catFilter || fmtFilter || diffFilter !== '' ? '未找到匹配的辩题' : '暂无辩题'}
            description="请调整筛选条件或添加新辩题" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((t) => (
            <div key={t.id} className="card p-6 group animate-fade-up">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="flex-1 font-serif text-lg font-bold leading-snug text-navy-900">{t.title}</h3>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => openEdit(t)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-700" aria-label="编辑">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeTopic(t.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="删除">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mb-4 space-y-2.5 rounded-xl bg-gradient-to-br from-ivory-50 to-ivory-100 p-4 ring-1 ring-navy-100/50">
                <div className="flex gap-2 text-sm">
                  <span className="shrink-0 font-medium text-navy-600">正方：</span>
                  <span className="text-navy-800">{t.proSide}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="shrink-0 font-medium text-navy-600">反方：</span>
                  <span className="text-navy-800">{t.conSide}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.category.map((c) => (
                    <span key={c} className={cn('badge ring-1', CATEGORY_COLORS[c], DIFFICULTY_COLORS[c])}>{c}</span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {t.formats.map((f) => (
                    <span key={f} className="badge bg-navy-50 text-navy-600 ring-1 ring-navy-200/50 text-[11px]">
                      {FORMAT_RULES[f].label}
                    </span>
                  ))}
                </div>
                <div className="ml-auto"><Stars level={t.difficulty} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editingId ? '编辑辩题' : '新增辩题'}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="btn-secondary">取消</button>
          <button onClick={handleSubmit} className="btn-primary"
            disabled={!form.title.trim() || !form.proSide.trim() || !form.conSide.trim() || form.category.length === 0 || form.formats.length === 0}>
            {editingId ? '保存修改' : '确认添加'}
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="label-base">辩题标题</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="请输入辩题标题" className="input-base" />
          </div>
          <div>
            <label className="label-base">正方立场</label>
            <input value={form.proSide} onChange={(e) => setForm({ ...form, proSide: e.target.value })}
              placeholder="正方主张..." className="input-base" />
          </div>
          <div>
            <label className="label-base">反方立场</label>
            <input value={form.conSide} onChange={(e) => setForm({ ...form, conSide: e.target.value })}
              placeholder="反方主张..." className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MultiSelect label="分类（多选）" options={categoryOptions} value={form.category}
              onChange={(v) => setForm({ ...form, category: v as TopicCategory[] })} />
            <MultiSelect label="适用赛制（多选）" options={formatOptions} value={form.formats}
              onChange={(v) => setForm({ ...form, formats: v as DebateFormat[] })} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label-base mb-0">难度等级</label>
              <span className="text-sm font-semibold text-gold-600">★ {form.difficulty}</span>
            </div>
            <input type="range" min={1} max={5} step={1} value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
              className="range-slider" />
            <div className="mt-2 flex justify-between text-xs text-navy-400">
              <span>简单</span><span>中等</span><span>困难</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
