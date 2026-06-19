import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, MessageSquareText } from 'lucide-react';

interface QRCodeDisplayProps {
  matchId: string;
  matchTitle?: string;
  size?: number;
}

const getBaseUrl = () => {
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
};

export const QRCodeDisplay = ({ matchId, matchTitle, size = 180 }: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setBaseUrl(getBaseUrl());
  }, []);

  const danmakuUrl = `${baseUrl}/danmaku/${matchId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(danmakuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpen = () => {
    window.open(`/danmaku/${matchId}`, '_blank');
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-navy-100/60">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-gold-500" />
          <span className="font-semibold text-sm text-navy-800">观众弹幕入口</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors"
            title="复制链接"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleOpen}
            className="p-1.5 rounded-md text-navy-500 hover:bg-navy-50 hover:text-navy-700 transition-colors"
            title="新窗口打开"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="p-3 bg-gradient-gold rounded-lg shadow-inner">
          <div className="bg-white p-2 rounded-md">
            {baseUrl ? (
              <QRCodeSVG
                value={danmakuUrl}
                size={size - 40}
                level="M"
                includeMargin={false}
                fgColor="#0F2944"
              />
            ) : (
              <div
                style={{ width: size - 40, height: size - 40 }}
                className="bg-navy-50 animate-pulse rounded"
              />
            )}
          </div>
        </div>

        {matchTitle && (
          <p className="mt-3 text-xs font-medium text-navy-600 text-center line-clamp-2 max-w-[160px]">
            {matchTitle}
          </p>
        )}

        <p className="mt-2 text-[10px] text-navy-400 text-center">
          扫码或点击上方按钮
          <br />
          发送实时弹幕
        </p>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
