import { Data } from './model';
import { report } from './analytics';
export function download(
  name: string,
  content: string | Blob,
  type = 'application/json',
) {
  const blob =
    typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJSON(data: Data) {
  download(
    `migraine-${data.mode}-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(data, null, 2),
  );
}
const csvCell = (value: unknown) =>
  '"' +
  String(value ?? '')
    .replace(/^[\s]*[=+@-]/, "'$&")
    .replaceAll('"', '""') +
  '"';
export function exportCSV(data: Data, from: string, to: string) {
  const r = report(data, from, to);
  const rows: unknown[][] = [['entity', 'date', 'field', 'value']];
  for (const [entity, items] of [
    ['daily_log', r.logs],
    ['attack', r.attacks],
    ['medication_intake', r.intakes],
  ] as const) {
    for (const item of items) {
      const at =
        'date' in item ? item.date : 'start' in item ? item.start : item.at;
      for (const [key, value] of Object.entries(item))
        rows.push([
          entity,
          at,
          key,
          typeof value === 'object' ? JSON.stringify(value) : value,
        ]);
    }
  }
  download(
    `migraine-report-${from}-${to}.csv`,
    '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'),
    'text/csv;charset=utf-8',
  );
}
export async function exportPDF(data: Data, from: string, to: string) {
  const { jsPDF } = await import('jspdf');
  const r = report(data, from, to);
  const pdf = new jsPDF();
  let y = 22;
  const line = (text: string, size = 10) => {
    pdf.setFontSize(size);
    for (const s of pdf.splitTextToSize(text, 170)) {
      if (y > 278) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(s, 20, y);
      y += 6;
    }
  };
  const n = (v: number | null) => (v === null ? 'Sem dados' : v.toFixed(1));
  line('MIGRAINE TERMINAL', 18);
  line('Relatorio pessoal de acompanhamento', 12);
  line(
    `Periodo: ${from} a ${to}${data.mode === 'demo' ? ' | DADOS FICTICIOS' : ''}`,
  );
  y += 5;
  line(`Crises iniciadas: ${r.total} | concluidas: ${r.completed}`);
  line(`Duracao media (crises concluidas): ${n(r.avgDuration)} h`);
  line(`Intensidade maxima media: ${n(r.avgIntensity)}/10`);
  line(`Sono medio: ${n(r.avgSleep)} h | stress medio: ${n(r.avgStress)}/10`);
  line(`Eficacia registada da medicacao: ${n(r.effectiveness)}/10`);
  line(`Registos diarios: ${r.logs.length}`);
  for (const [title, values] of [
    ['Medicacao (tomas)', r.medications],
    ['Sintomas registados', r.symptoms],
    ['Possiveis triggers (ocorrencias)', r.triggers],
    ['Horario de inicio', r.startHours],
    ['Dia de inicio', r.weekdays],
  ] as const) {
    y += 4;
    line(title, 12);
    if (!values.length) line('Sem dados');
    for (const [name, count] of values) line(`${name}: ${count}`);
  }
  y += 4;
  line('Crises', 12);
  for (const a of r.attacks)
    line(
      `${new Date(a.start).toLocaleString('pt-PT')} - ${a.end ? new Date(a.end).toLocaleString('pt-PT') : 'Activa'} | intensidade maxima ${a.maxIntensity}/10 | ${a.notes} | residual: ${a.residual || '-'}`,
    );
  line('Observacoes', 12);
  for (const text of r.observations) line(text);
  y += 4;
  line(
    'Dados introduzidos pelo utilizador. Associacoes observadas nao estabelecem causalidade. Este relatorio nao constitui diagnostico nem recomendacao de tratamento. Crises contabilizadas pela data local de inicio; duracoes completas, sem truncar ao periodo.',
  );
  download(
    `migraine-report-${from}-${to}.pdf`,
    pdf.output('blob'),
    'application/pdf',
  );
}
