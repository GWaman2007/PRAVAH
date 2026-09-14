import React, { useState } from 'react';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Send, 
  User, 
  ExternalLink,
  CheckCircle2,
  CloudOff,
  Navigation
} from 'lucide-react';
import type { Incident, AuthorRole } from '../types/incident';
import { 
  calculateIncidentConfidence, 
  formatTimeAgo, 
  getSeverityStyle, 
  getRoleBadge 
} from '../utils/offlineEngine';

interface IncidentCardProps {
  incident: Incident;
  onVote: (id: string, voteType: 'up' | 'down') => void;
  onLocateOnMap: (incident: Incident) => void;
  onAddUpdate: (incidentId: string, updateData: { author: string; role: AuthorRole; message: string }) => void;
  onOpenLightbox: (imageUrl: string) => void;
  isSelected?: boolean;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onVote,
  onLocateOnMap,
  onAddUpdate,
  onOpenLightbox,
  isSelected = false,
}) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentRole, setCommentRole] = useState<AuthorRole>('Registered Driver');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { score, badge, badgeColor, hasOfficer } = calculateIncidentConfidence(incident);
  const severityStyle = getSeverityStyle(incident.severity);
  const roleStyle = getRoleBadge(incident.author.role);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    onAddUpdate(incident.id, {
      author: commentAuthor.trim() || (commentRole === 'Field Officer (BRO/Police)' ? 'BRO Field Engineer' : 'Ground Driver'),
      role: commentRole,
      message: newCommentText.trim(),
    });

    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  return (
    <div 
      id={`incident-card-${incident.id}`}
      className={`group relative rounded-xl border bg-slate-900/90 backdrop-blur-sm transition-all duration-300 shadow-md ${
        isSelected 
          ? 'border-orange-500 shadow-orange-500/20 ring-2 ring-orange-500/30' 
          : 'border-slate-800 hover:border-slate-700 hover:shadow-lg'
      }`}
    >
      {/* Top Banner for Offline Pending Sync */}
      {incident.sync_status === 'PENDING' && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-3 py-1 flex items-center justify-between text-xs text-amber-300 rounded-t-xl font-mono">
          <span className="flex items-center gap-1.5">
            <CloudOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Pending Sync (Stored Locally in Browser Queue)</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            Offline Mode
          </span>
        </div>
      )}

      <div className="flex">
        {/* Left Reddit Voting Column */}
        <div className="w-12 sm:w-14 flex flex-col items-center py-3 bg-slate-950/40 rounded-l-xl border-r border-slate-800/60 select-none">
          {/* Upvote Button */}
          <button
            onClick={() => onVote(incident.id, 'up')}
            title="Upvote ground report"
            className={`p-1 sm:p-1.5 rounded-lg transition-transform active:scale-125 ${
              incident.votes.userVote === 'up'
                ? 'text-[#FF4500] bg-orange-500/10 scale-110'
                : 'text-slate-400 hover:text-[#FF4500] hover:bg-slate-800'
            }`}
          >
            <ArrowBigUp 
              className={`w-6 h-6 sm:w-7 sm:h-7 ${
                incident.votes.userVote === 'up' ? 'fill-[#FF4500] stroke-[#FF4500]' : 'stroke-current'
              }`} 
            />
          </button>

          {/* Live Dynamic Score */}
          <span
            className={`text-xs sm:text-sm font-bold my-1 tracking-tight ${
              incident.votes.userVote === 'up'
                ? 'text-[#FF4500]'
                : incident.votes.userVote === 'down'
                ? 'text-[#7193FF]'
                : 'text-slate-300'
            }`}
          >
            {score}
          </span>

          {/* Downvote Button */}
          <button
            onClick={() => onVote(incident.id, 'down')}
            title="Downvote report / Mark unverified or cleared"
            className={`p-1 sm:p-1.5 rounded-lg transition-transform active:scale-125 ${
              incident.votes.userVote === 'down'
                ? 'text-[#7193FF] bg-blue-500/10 scale-110'
                : 'text-slate-400 hover:text-[#7193FF] hover:bg-slate-800'
            }`}
          >
            <ArrowBigDown 
              className={`w-6 h-6 sm:w-7 sm:h-7 ${
                incident.votes.userVote === 'down' ? 'fill-[#7193FF] stroke-[#7193FF]' : 'stroke-current'
              }`} 
            />
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-3.5 sm:p-4 space-y-3">
          
          {/* Header: Corridor Flair, Role Pill, Timestamp */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Corridor Flair */}
            <span className="font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-md hover:bg-orange-500/20 transition-colors cursor-pointer">
              {incident.corridorFlair}
            </span>

            {/* Author Role Badge */}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
              {roleStyle.isOfficer ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <User className="w-3 h-3 text-slate-400 shrink-0" />
              )}
              <span>{incident.author.name}</span>
              <span className="text-slate-500">•</span>
              <span className="opacity-90">{roleStyle.label}</span>
            </span>

            {/* Timestamp */}
            <span className="flex items-center gap-1 text-slate-400 text-[11px] ml-auto">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatTimeAgo(incident.timestamp)}
            </span>
          </div>

          {/* Title & Type */}
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug tracking-tight hover:text-orange-300 transition-colors">
              {incident.title}
            </h3>

            {/* Tags row: Severity & Type */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Severity badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}>
                <span className={`w-2 h-2 rounded-full ${severityStyle.dot} animate-pulse`}></span>
                {incident.severity}
              </span>

              {/* Incident Type */}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {incident.incidentType}
              </span>

              {/* Geographic Place Name */}
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{incident.location.placeName}</span>
              </span>
            </div>
          </div>

          {/* Media / Blockage Photo Preview Thumbnail */}
          {incident.mediaUrl && (
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950/60 max-h-56 group/img">
              <img
                src={incident.mediaUrl}
                alt={incident.title}
                onClick={() => onOpenLightbox(incident.mediaUrl)}
                className="w-full h-44 sm:h-52 object-cover object-center cursor-pointer transition-transform duration-300 group-hover/img:scale-105"
                loading="lazy"
              />
              <div 
                onClick={() => onOpenLightbox(incident.mediaUrl)}
                className="absolute inset-0 bg-slate-950/20 group-hover/img:bg-slate-950/40 cursor-pointer flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <span className="px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-medium border border-slate-700 flex items-center gap-1.5 backdrop-blur-sm">
                  <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                  Inspect Photo
                </span>
              </div>
            </div>
          )}

          {/* Confidence Score Chip & Verification State */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              {/* Confidence status chip */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                  badgeColor === 'emerald'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                    : badgeColor === 'amber'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {badgeColor === 'emerald' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {badgeColor === 'amber' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                {badgeColor === 'slate' && <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />}
                <span>{badge}</span>
                {hasOfficer && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                    +10 BRO Officer Boost
                  </span>
                )}
              </span>
            </div>

            {/* Action Buttons: Locate on Map & Toggle Comments */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onLocateOnMap(incident)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                title="Pan and zoom map to this incident marker"
              >
                <Navigation className="w-3.5 h-3.5 text-orange-400" />
                <span>Locate on Map</span>
              </button>

              <button
                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isCommentsOpen || incident.updates.length > 0
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>{incident.updates.length} Ground Updates</span>
              </button>
            </div>
          </div>

          {/* Threaded Chronological Status Comments (Expandable) */}
          {isCommentsOpen && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                  Chronological Clearance Updates ({incident.updates.length})
                </h4>
                <span className="text-[11px] text-slate-500">Live Field Log</span>
              </div>

              {/* Updates Timeline List */}
              {incident.updates.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  No clearance updates posted yet. Be the first to report ground progress!
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {incident.updates.map((update) => {
                    const uRole = getRoleBadge(update.role);
                    return (
                      <div
                        key={update.id}
                        className={`p-2.5 rounded-md border text-xs space-y-1 ${
                          uRole.isOfficer
                            ? 'bg-emerald-950/25 border-emerald-500/30 text-slate-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold flex items-center gap-1">
                            {uRole.isOfficer && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                            <span>{update.author}</span>
                            <span className="text-slate-500">•</span>
                            <span className={uRole.text}>{uRole.label}</span>
                          </span>
                          <span className="text-slate-500">{formatTimeAgo(update.timestamp)}</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed text-xs">
                          {update.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Form to post new ground update */}
              <form onSubmit={handleCommentSubmit} className="pt-2 border-t border-slate-800/60 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name (or callsign)"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={commentRole}
                    onChange={(e) => setCommentRole(e.target.value as AuthorRole)}
                    className="bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Registered Driver">Registered Driver</option>
                    <option value="Field Officer (BRO/Police)">Field Officer (BRO/Police) [+10 Boost]</option>
                    <option value="Local Citizen">Local Citizen</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log clearance status (e.g., JCB arrived, single lane open)..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    className="px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
