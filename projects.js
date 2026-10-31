import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON("../lib/projects.json");
let query = '';

const projectsContainer = document.querySelector(".projects");
renderProjects(projects, projectsContainer, "h2");

const projectsTitle = document.querySelector(".projects-title");
projectsTitle.textContent = `${projects.length} Projects`;

let selectedIndex = -1;

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
                selectedIndex = selectedIndex === i ? -1 : i;

                newSVG.selectAll('path')
                    .attr('class', (_, idx) => (
                        selectedIndex === idx ? 'selected' : ''
                    ));

                legend.selectAll('li')
                    .attr('class', (_, idx) => (
                        selectedIndex === idx ? 'legend-item selected' : 'legend-item'
                    ));
 

                if (selectedIndex === -1) {
                    renderProjects(projects, projectsContainer, 'h2');
                    projectsTitle.textContent = `${projects.length} Projects`;
                } else {
                    let selectedYear = newData[selectedIndex].label;

                    let filteredProjects = projects.filter((project) =>
                        project.year === selectedYear
                    );

                    renderProjects(filteredProjects, projectsContainer, 'h2');
                    projectsTitle.textContent = `${filteredProjects.length} Projects`;
                }
            });
    });

    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${newColors(idx)}`)
            .attr('class', selectedIndex === idx ? 'legend-item selected' : 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}

renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
    query = event.target.value;

    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');
    projectsTitle.textContent = `${filteredProjects.length} Projects`;
    selectedIndex = -1;
    renderPieChart(filteredProjects);
});