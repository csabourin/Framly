import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { selectCurrentElements } from '../../store/selectors';
import { selectElement, updateElement } from '../../store/canvasSlice';
import { withHistoryGroup } from '../../utils/historyIntegration';
import {
  headingIssues, headingLevelOf, headingOutline, issueFor, suggestLevelForExisting,
} from '../../utils/headingOutline';
import type { CanvasElement } from '../../types/canvas';
import PropertyLabel from './PropertyLabel';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Heading level as page structure, not as text size.
 *
 * The old control was a dropdown reading "H1 (Largest)" — which teaches the
 * wrong thing twice over: it describes a heading by how big it looks, and it
 * hides the only question that matters, which is where this heading sits in
 * the page's outline. So the level is a row of six chips with the outline
 * printed underneath, and a problem says what is wrong in a sentence and
 * offers the level that fixes it.
 */
export default function HeadingStructure({ element }: { element: CanvasElement }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const elements = useSelector(selectCurrentElements);

  const { outline, issues, suggestion, level } = useMemo(() => ({
    outline: headingOutline(elements),
    issues: headingIssues(elements),
    suggestion: suggestLevelForExisting(elements, element.id),
    level: headingLevelOf(element),
  }), [elements, element]);

  const issue = issueFor(issues, element.id);
  const setLevel = (next: number) => {
    if (next === level) return;
    withHistoryGroup(t('headings.undoLabel', { level: next }), () => {
      dispatch(updateElement({ id: element.id, updates: { headingLevel: next as CanvasElement['headingLevel'] } }));
    });
  };

  const labelOf = (entry: { text: string }) => entry.text || t('headings.untitled');
  const shallowest = outline.length ? Math.min(...outline.map((entry) => entry.level)) : 1;

  return <section className="heading-structure" aria-label={t('headings.title')} data-testid="heading-structure">
    <h3><PropertyLabel label={t('headings.level')} term={`h${level}`} /></h3>

    <div className="heading-levels" role="group" aria-label={t('headings.level')}>
      {LEVELS.map((option) => <button key={option} type="button"
        aria-pressed={option === level}
        aria-label={option === suggestion.level
          ? t('headings.levelSuggestedOption', { level: option })
          : t('headings.levelOption', { level: option })}
        className={option === suggestion.level ? 'is-suggested' : undefined}
        data-testid={`heading-level-${option}`}
        onClick={() => setLevel(option)}>H{option}</button>)}
    </div>

    <p className="heading-reason" data-testid="heading-reason">
      {suggestion.after
        ? t(`headings.reason.${suggestion.reason}`, {
            level: suggestion.level, after: labelOf(suggestion.after), afterLevel: suggestion.after.level,
          })
        : t(`headings.reason.${suggestion.reason}`, { level: suggestion.level })}
    </p>

    {/* A live region: the mistake is usually made by changing the level right
        above this, so the warning has to reach a screen reader without the
        user going looking for it. */}
    {issue && <div className="heading-problem" role="status" data-testid="heading-problem">
      <p><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {t(`headings.problem.${issue.problem}`, {
        level: issue.level, previous: issue.previousLevel, suggested: issue.suggested,
      })}</p>
      <button type="button" data-testid="heading-fix" onClick={() => setLevel(issue.suggested)}>
        {t('headings.fix', { level: issue.suggested })}
      </button>
    </div>}

    <details className="heading-outline" open={issues.length > 0} data-testid="heading-outline">
      <summary>{t('headings.outline', { count: outline.length })}</summary>
      <ol>
        {outline.map((entry) => {
          const problem = issueFor(issues, entry.id);
          return <li key={entry.id} style={{ paddingInlineStart: `${(entry.level - shallowest) * 12}px` }}>
            <button type="button" aria-current={entry.id === element.id ? 'true' : undefined}
              data-testid={`heading-outline-${entry.id}`}
              onClick={() => dispatch(selectElement(entry.id))}>
              <code>h{entry.level}</code>
              <span>{labelOf(entry)}</span>
              {problem && <AlertTriangle className="w-3 h-3 shrink-0" role="img" aria-label={t('headings.problemShort')} />}
            </button>
          </li>;
        })}
      </ol>
    </details>
  </section>;
}
