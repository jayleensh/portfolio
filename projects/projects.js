import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON("../lib/projects.json");

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");

let query = '';
let selectedYear = null;

// projects matching the search (ignores the selected year)
function getSearchFiltered() {
    return projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });
}

// one place that applies filters and re-renders everything
function update() {
    let searchFiltered = getSearchFiltered();

    if (selectedYear !== null &&
        !searchFiltered.some((p) => p.year === selectedYear)) {
        selectedYear = null;
    }

    let visible = selectedYear === null
        ? searchFiltered
        : searchFiltered.filter((p) => p.year === selectedYear);

    renderProjects(visible, projectsContainer, 'h2');
    projectsTitle.textContent = `${visible.length} Projects`;

    renderPieChart(searchFiltered);
}


function renderPieChart(projectsGiven) {
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );

    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let newArcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => newArcGenerator(d));

    let newColors = d3.scaleOrdinal(d3.schemeTableau10);

    let selectedIndex = newData.findIndex((d) => d.label === selectedYear);

    let newSVG = d3.select('#projects-pie-plot');
    newSVG.selectAll('path').remove();

    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    newArcs.forEach((arc, i) => {
        newSVG.append('path')
            .attr('d', arc)
            .attr('fill', newColors(i))
            .attr('class', selectedIndex === i ? 'selected' : '')
            .on('click', () => {
                let year = newData[i].label;
                selectedYear = selectedYear === year ? null : year;
                update();
            });
    });

    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${newColors(idx)}`)
            .attr('class', selectedIndex === idx ? 'legend-item selected' : 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

update();

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    update();
});