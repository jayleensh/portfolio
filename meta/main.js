import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/jayleensh/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // number of files
  const numFiles = d3.group(data, (d) => d.file).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  // maximum depth
  const maxDepth = d3.max(data, (d) => d.depth);
  dl.append('dt').text('Maximum depth');
  dl.append('dd').text(maxDepth);

  // longest line (in characters)
  const longestLine = d3.max(data, (d) => d.length);
  dl.append('dt').text('Longest line');
  dl.append('dd').text(longestLine);

  // average file length (in lines)
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file,
  );
  const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
  dl.append('dt').text('Average file length');
  dl.append('dd').text(Math.round(avgFileLength));
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    timeStyle: 'short',
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
  svg.call(d3.brush().on('start brush end', brushed));
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

  // Count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.select('#chart').selectAll('.dots circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderScatterPlot() {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`);

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  svg.append('g').attr('class', 'dots');
  createBrushSelector(svg);
}

function updateScatterPlot(visibleCommits) {
  const svg = d3.select('#chart svg');
  xScale.domain(d3.extent(visibleCommits, (d) => d.datetime)).nice();
  svg.select('g.x-axis').call(d3.axisBottom(xScale));

  const rScale = d3
    .scaleSqrt()
    .domain(d3.extent(visibleCommits, (d) => d.totalLines))
    .range([2, 30]);
  const sortedCommits = d3.sort(visibleCommits, (d) => -d.totalLines);

  updateTooltipVisibility(false);
  svg.select('g.dots')
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'var(--color-accent)')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  brushed({ selection: d3.brushSelection(svg.node()) });
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((commit) => commit.lines);
  const files = d3
    .groups(lines, (line) => line.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const rows = d3.select('#files')
    .selectAll(':scope > div')
    .data(files, (file) => file.name)
    .join((enter) => enter.append('div').call((row) => {
      const label = row.append('dt');
      label.append('code');
      label.append('small');
      row.append('dd');
    }));

  rows.select('dt > code').text((file) => file.name);
  rows.select('dt > small').text((file) => {
    const count = file.lines.length;
    return `${count} ${count === 1 ? 'line' : 'lines'}`;
  });

  rows.select('dd')
    .selectAll('.loc')
    .data((file) => file.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', (line) => colors(line.type))
    .attr('aria-hidden', 'true');
}


let data = await loadData();

const colors = d3.scaleOrdinal()
  .domain(['CSS', 'HTML', 'JS', 'Svelte'])
  .range([
    'var(--meta-css)',
    'var(--meta-html)',
    'var(--meta-js)',
    'var(--meta-svelte)'
  ])
  .unknown('var(--color-accent)');
let commits = processCommits(data);
let filteredCommits = commits;

let commitMaxTime;

function updateCommitCutoff(datetime) {
  commitMaxTime = datetime;
  if (Number.isNaN(commitMaxTime.getTime())) return;

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

renderCommitInfo(data, commits);
renderScatterPlot();
updateCommitCutoff(commits[0].datetime);

const steps = d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits, (commit) => commit.id)
  .join('div')
  .attr('class', 'step');

steps.each(function (commit, index) {
  const date = commit.datetime.toLocaleString('en', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const fileCount = new Set(commit.lines.map((line) => line.file)).size;
  const paragraph = d3.select(this).append('p');

  paragraph.append('time')
    .attr('datetime', commit.datetime.toISOString())
    .text(date);
  paragraph.append('span').text(index === 0 ? ' · First commit ' : ' · Commit ');
  paragraph.append('a')
    .attr('href', commit.url)
    .attr('target', '_blank')
    .attr('rel', 'noopener')
    .text(commit.id.slice(0, 7));
  paragraph.append('span').text(
    ` covers ${commit.totalLines} ${commit.totalLines === 1 ? 'line' : 'lines'} across ${fileCount} ${fileCount === 1 ? 'file' : 'files'}.`,
  );
});

function onStepEnter({ element }) {
  const { datetime } = d3.select(element).datum();
  updateCommitCutoff(datetime);
}

if (commits.length) {
  scrollama()
    .setup({ container: '#scrolly-1', step: '#scrolly-1 .step' })
    .onStepEnter(onStepEnter);
}
