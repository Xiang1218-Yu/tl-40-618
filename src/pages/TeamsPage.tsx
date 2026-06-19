import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Upload,
  Users,
  Trash2,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { uid } from '@/engines/scoringEngine';
import TeamCard from '@/components/cards/TeamCard';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';
import type { Team, Player } from '@/types';

type PlayerRole = Player['role'];
const ROLES: PlayerRole[] = ['一辩', '二辩', '三辩', '四辩'];

interface FormPlayer {
  name: string;
  role: PlayerRole;
  contact: string;
}

function createEmptyPlayers(): FormPlayer[] {
  return ROLES.map((r) => ({ name: '', role: r, contact: '' }));
}

interface ParsedTeam {
  name: string;
  institution: string;
  seed?: number;
  players: { name: string; role: PlayerRole; contact?: string }[];
}

const parseBulkInput = (text: string): { teams: ParsedTeam[]; errors: string[] } => {
  const teams: ParsedTeam[] = [];
  const errors: string[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let currentTeam: ParsedTeam | null = null;
  let playerIndex = 0;

  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.replace(/[，,]/g, '\t').split('\t').map((s) => s.trim()).filter(Boolean);
    if (line.length === 0) return;

    if (line.length >= 2 && line[0] && !ROLES.includes(line[0] as PlayerRole)) {
      if (currentTeam) teams.push(currentTeam);
      const name = line[0] || '';
      const institution = line[1] || '';
      const seed = line[2] ? parseInt(line[2]) || undefined : undefined;
      currentTeam = {
        name,
        institution,
        seed,
        players: [],
      };
      playerIndex = 0;
      if (!name) errors.push(`第${lineIdx + 1}行：队伍名称不能为空`);
      if (!institution) errors.push(`第${lineIdx + 1}行：所属学校不能为空`);
    } else if (currentTeam && (ROLES.includes(line[0] as PlayerRole) || line[0])) {
      const role = ROLES.includes(line[0] as PlayerRole)
        ? (line[0] as PlayerRole)
        : (ROLES[playerIndex] ?? '一辩');
      const pName = ROLES.includes(line[0] as PlayerRole) ? (line[1] || '') : (line[0] || '');
      const contact = line.length > 2 ? line[2] : (line.length > 1 && !ROLES.includes(line[0] as PlayerRole) ? line[1] : '');
      if (pName) {
        currentTeam.players.push({ name: pName, role, contact: contact || undefined });
        playerIndex = (playerIndex + 1) % 4;
      }
    }
  });
  if (currentTeam) teams.push(currentTeam);
  return { teams, errors };
};

export default function TeamsPage() {
  const teams = useDebateStore((s) => s.teams);
  const addTeam = useDebateStore((s) => s.addTeam);
  const updateTeam = useDebateStore((s) => s.updateTeam);
  const removeTeam = useDebateStore((s) => s.removeTeam);
  const bulkAddTeams = useDebateStore((s) => s.bulkAddTeams);

  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [institution, setInstitution] = useState('');
  const [seed, setSeed] = useState<number>(1);
  const [players, setPlayers] = useState<FormPlayer[]>(createEmptyPlayers());
  const [confirmDel, setConfirmDel] = useState<Team | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkParsed, setBulkParsed] = useState<ParsedTeam[] | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  const handleBulkParse = () => {
    const result = parseBulkInput(bulkText);
    setBulkParsed(result.teams);
    setBulkErrors(result.errors);
  };

  const handleBulkImport = () => {
    if (!bulkParsed || bulkParsed.length === 0) return;
    const validTeams = bulkParsed.map((t) => ({
      name: t.name,
      institution: t.institution,
      seed: t.seed ?? teams.length + bulkParsed.indexOf(t) + 1,
      players: t.players.map((p) => ({
        id: uid(),
        name: p.name,
        role: p.role,
        contact: p.contact,
        scores: [],
      })),
    }));
    bulkAddTeams(validTeams);
    setBulkOpen(false);
    setBulkText('');
    setBulkParsed(null);
    setBulkErrors([]);
  };

  const validTeams = useMemo(() => teams.filter((t) => !t.id.startsWith('__')), [teams]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return validTeams;
    return validTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(k) ||
        t.institution.toLowerCase().includes(k) ||
        t.players.some((p) => p.name.toLowerCase().includes(k))
    );
  }, [validTeams, keyword]);

  const openAdd = () => {
    setEditingId(null);
    setTeamName('');
    setInstitution('');
    setSeed(validTeams.length + 1);
    setPlayers(createEmptyPlayers());
    setModalOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingId(team.id);
    setTeamName(team.name);
    setInstitution(team.institution);
    setSeed(team.seed);
    const main = team.players.filter((p) => p.role !== '替补');
    setPlayers(
      ROLES.map((r, i) => {
        const found = main[i];
        return {
          name: found?.name ?? '',
          role: (found?.role ?? r) as PlayerRole,
          contact: found?.contact ?? '',
        };
      })
    );
    setModalOpen(true);
  };

  const canSubmit =
    teamName.trim() &&
    institution.trim() &&
    players.filter((p) => p.name.trim()).length >= 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const validPlayers = players
      .filter((p) => p.name.trim())
      .map<Player>((p) => ({
        id: uid(),
        name: p.name.trim(),
        role: p.role,
        contact: p.contact.trim() || undefined,
        scores: [],
      }));
    if (editingId) {
      const existing = teams.find((t) => t.id === editingId);
      const subs = existing?.players.filter((p) => p.role === '替补') ?? [];
      updateTeam(editingId, {
        name: teamName.trim(),
        institution: institution.trim(),
        seed,
        players: [...validPlayers, ...subs],
      });
    } else {
      addTeam({
        name: teamName.trim(),
        institution: institution.trim(),
        seed,
        players: validPlayers,
      });
    }
    setModalOpen(false);
  };

  const confirmDelete = (t: Team) => setConfirmDel(t);
  const doDelete = () => {
    if (confirmDel) removeTeam(confirmDel.id);
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-gold-500" />队伍管理
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            共 {validTeams.length} 支队伍，已筛选 {filtered.length} 支
          </p>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索队伍名、学校或选手姓名..."
            className="input-base pl-10"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" />新增队伍
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setBulkOpen(true);
              setBulkText('');
              setBulkParsed(null);
              setBulkErrors([]);
            }}
          >
            <Upload className="w-4 h-4" />批量导入
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-fade-in">
          {filtered.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              onEdit={openEdit}
              onDelete={confirmDelete}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Users className="h-10 w-10" strokeWidth={1.5} />}
          title={keyword ? '未找到匹配的队伍' : '暂无队伍'}
          description={keyword ? '试试其他关键词，或检查拼写是否正确。' : '点击右上角按钮添加第一支队伍开始吧！'}
          action={
            !keyword && (
              <button onClick={openAdd} className="btn-primary">
                <Plus className="w-4 h-4" />新增队伍
              </button>
            )
          }
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑队伍' : '新增队伍'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
              {editingId ? '保存修改' : '创建队伍'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-base">队伍名称 <span className="text-red-500">*</span></label>
            <input
              className="input-base"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="例如：思辨先锋队"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">所属学校 <span className="text-red-500">*</span></label>
              <input
                className="input-base"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="例如：清华大学"
              />
            </div>
            <div>
              <label className="label-base">种子排位</label>
              <input
                type="number"
                min={1}
                className="input-base"
                value={seed}
                onChange={(e) => setSeed(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-base mb-0">选手名单（至少 1 名）</label>
              <span className="text-xs text-navy-400">{players.filter(p => p.name.trim()).length}/4 已填写</span>
            </div>
            <div className="space-y-2.5">
              {players.map((p, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center rounded-xl bg-ivory-50 p-2.5 ring-1 ring-navy-100"
                >
                  <select
                    className="input-base text-xs py-2 px-2"
                    value={p.role}
                    onChange={(e) => {
                      const next = [...players];
                      next[idx] = { ...p, role: e.target.value as PlayerRole };
                      setPlayers(next);
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    className="input-base py-2 px-3"
                    value={p.name}
                    onChange={(e) => {
                      const next = [...players];
                      next[idx] = { ...p, name: e.target.value };
                      setPlayers(next);
                    }}
                    placeholder={`选手 ${idx + 1} 姓名`}
                  />
                  <input
                    className="input-base py-2 px-3"
                    value={p.contact}
                    onChange={(e) => {
                      const next = [...players];
                      next[idx] = { ...p, contact: e.target.value };
                      setPlayers(next);
                    }}
                    placeholder="联系方式"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="确认删除"
        footer={
          <>
            <button onClick={() => setConfirmDel(null)} className="btn-secondary">
              取消
            </button>
            <button onClick={doDelete} className="btn-danger">
              <Trash2 className="w-4 h-4" />确认删除
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
            <X className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-navy-800 mb-1">
              确定要删除队伍「{confirmDel?.name}」吗？
            </p>
            <p className="text-sm text-navy-500">
              删除后无法恢复，相关比赛数据也可能受到影响。
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="批量导入队伍"
        footer={
          <>
            <button onClick={() => setBulkOpen(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleBulkParse}
              className="btn-secondary"
              disabled={!bulkText.trim()}
            >
              <FileText className="w-4 h-4" />解析数据
            </button>
            <button
              onClick={handleBulkImport}
              className="btn-primary"
              disabled={!bulkParsed || bulkParsed.length === 0}
            >
              <CheckCircle2 className="w-4 h-4" />
              导入 {bulkParsed?.length ?? 0} 支队伍
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-base">导入格式说明</label>
            <div className="bg-ivory-100 rounded-lg p-3 text-xs text-navy-600 space-y-1.5 font-mono">
              <p>每行一个队伍或选手，用逗号、Tab或空格分隔：</p>
              <p>• 队伍行：<span className="font-bold">队伍名称, 所属学校, 种子排位(可选)</span></p>
              <p>• 选手行：<span className="font-bold">辩位, 姓名, 联系方式(可选)</span></p>
              <p>• 或选手行直接：<span className="font-bold">选手姓名, 联系方式</span>（自动分配辩位）</p>
            </div>
          </div>
          <div>
            <label className="label-base">粘贴队伍数据</label>
            <textarea
              rows={10}
              className="input-base resize-none font-mono text-sm"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`示例：\n青锋队, 北京大学, 1\n一辩, 张三, zhangsan@pku.edu\n二辩, 李四\n三辩, 王五\n四辩, 赵六\n\n明辩队, 清华大学, 2\n一辩, 钱七\n二辩, 孙八\n...`}
            />
          </div>

          {bulkErrors.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 space-y-0.5">
                <p className="font-semibold">解析发现 {bulkErrors.length} 个问题：</p>
                {bulkErrors.slice(0, 5).map((e, i) => (
                  <p key={i}>• {e}</p>
                ))}
                {bulkErrors.length > 5 && <p>• ... 还有 {bulkErrors.length - 5} 个问题</p>}
              </div>
            </div>
          )}

          {bulkParsed && bulkParsed.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 space-y-0.5 flex-1">
                <p className="font-semibold">解析成功！共 {bulkParsed.length} 支队伍</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 scroll-thin">
                  {bulkParsed.map((t, i) => (
                    <div key={i} className="bg-white/60 rounded px-2 py-1.5">
                      <span className="font-medium text-navy-800">{t.name}</span>
                      <span className="text-navy-500 mx-1">·</span>
                      <span className="text-navy-600">{t.institution}</span>
                      <span className="text-navy-400 ml-2">
                        ({t.players.map((p) => p.name).join('、')})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
