import type { Command } from '../types.js';
import { getUsageSummary, resetUsage } from '../llm/usage.js';
import { header, info, success, blank, c, divider } from '../ui.js';

function fmtCost(usd: number): string {
  return usd === 0 ? c.muted('~$0.00') : c.value(`$${usd.toFixed(4)}`);
}

function fmtTokens(n: number): string {
  return n.toLocaleString('en-US');
}

export const usageCommand: Command = {
  name: 'usage',
  description: 'Show LLM token usage and estimated cost for this session',
  aliases: ['cost', 'tokens'],

  async execute(args, _ctx) {
    if (args[0] === 'reset' || args[0] === 'clear') {
      resetUsage();
      success('Usage counters reset.');
      return;
    }

    const { totals, byProvider, byModel } = getUsageSummary();

    header('LLM Usage (this session)');

    if (totals.calls === 0) {
      info('No LLM calls recorded yet this session.');
      return;
    }

    blank();
    info(`${c.label('Total calls:')}  ${c.value(String(totals.calls))}`);
    info(`${c.label('Prompt tokens:')}  ${fmtTokens(totals.promptTokens)}`);
    info(`${c.label('Output tokens:')}  ${fmtTokens(totals.completionTokens)}`);
    info(`${c.label('Total tokens:')}  ${fmtTokens(totals.totalTokens)}`);
    info(`${c.label('Estimated cost:')}  ${fmtCost(totals.costUsd)}`);

    blank();
    divider();
    info(c.label('By model:'));
    for (const [model, t] of Object.entries(byModel)) {
      info(`  ${c.primary(model)} — ${fmtTokens(t.totalTokens)} tokens, ${fmtCost(t.costUsd)} (${t.calls} calls)`);
    }

    blank();
    info(c.label('By provider:'));
    for (const [provider, t] of Object.entries(byProvider)) {
      info(`  ${c.accent(provider)} — ${fmtTokens(t.totalTokens)} tokens, ${fmtCost(t.costUsd)}`);
    }

    blank();
    info(c.muted('Costs are rough estimates. Use `/usage reset` to clear.'));
  },
};
