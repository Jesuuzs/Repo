/*
  scripts.js – interactivity for the simple static presentation site.

  This script loads the report data from public/data/report.json, builds
  paragraphs with links to corresponding charts, renders interactive
  charts using Chart.js (with the annotation plugin), generates flip
  tiles showing consequences and solutions, populates the list of
  sources, and wires up interactions such as hover highlights and
  smooth scrolling.

  The design avoids any build step or framework: it runs in the
  browser as plain JavaScript. All dates are converted to Date objects
  (first day of the year) to allow Chart.js to plot them on a time
  axis. When hovering over text links in the synthesis section, the
  associated chart series is highlighted and a shaded range is drawn
  between the start and end dates defined in the JSON. Clicking a
  link scrolls smoothly to the corresponding chart.

  Charts are configured to show custom tooltips with the indicator
  label, value, unit and a short source reference. A simple custom
  legend click handler toggles dataset visibility. Annotations are
  managed dynamically when highlighting and removed afterwards.

  The flip tiles use CSS transforms for a 3D rotation on hover; the
  script only generates their DOM structure from the JSON and does not
  require additional JS for the flip itself. Each tile displays a
  consequence on the front and a proposed solution with KPI, delay
  and impact on the back.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Define a colour palette for multiple charts. When more colours
  // are needed than provided here, the palette loops back.
  const colourPalette = [
    '#0055a4', // Marianne blue
    '#ef4135', // Marianne red
    '#007a33', // green accent
    '#8e44ad', // purple
    '#e67e22', // orange
    '#2980b9', // blue
    '#c0392b', // red
    '#16a085'  // teal
  ];

  // Store chart instances keyed by indicator id for later access
  const chartInstances = {};

  // Cache containers
  const paragraphContainer = document.getElementById('paragraph-container');
  const chartsContainer = document.getElementById('charts-container');
  const tilesContainer = document.getElementById('tiles-container');
  const sourcesList = document.getElementById('sources-list');

  // Load JSON data
  fetch('public/data/report.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données');
      }
      return response.json();
    })
    .then(data => {
      buildParagraphs(data.paragraphes, data.indicateurs);
      buildCharts(data.indicateurs);
      buildTiles(data.tuiles, data.indicateurs);
      buildSources(data.sources, data.indicateurs);

      // After charts are built, register hover/click listeners on paragraph links
      wireParagraphInteractions();

      // Register click on logo to scroll to top
      const logoEl = document.getElementById('logo');
      if (logoEl) {
        logoEl.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // Turn navigation items into tabs. Each nav link targets a section id
      // via its href (e.g. #synthese). Clicking a nav item hides other
      // sections and shows the target section only. This prevents the
      // page from becoming infinitely long and compartmentalises each
      // module. The first section listed in the navigation is shown by
      // default on page load.
      setupTabs();
    })
    .catch(err => {
      console.error(err);
      paragraphContainer.textContent = 'Impossible de charger les données.';
    });

  /**
   * Build the synthesis paragraphs with links to corresponding series.
   * Each paragraph displays its title and text and appends anchor
   * elements referencing the linked indicator IDs. Range data (plage)
   * is stored as dataset attributes on the anchor elements.
   *
   * @param {Array} paragraphes Array of paragraph objects
   * @param {Array} indicateurs Array of indicator objects
   */
  function buildParagraphs(paragraphes, indicateurs) {
    paragraphes.forEach(p => {
      const article = document.createElement('article');
      const h2 = document.createElement('h2');
      h2.textContent = p.titre;
      article.appendChild(h2);
      const para = document.createElement('p');
      // Add the text content
      para.textContent = p.texte + ' ';
      // Append anchor links for each reference
      p.liens.forEach((link, idx) => {
        if (link.type === 'serie') {
          const indicator = indicateurs.find(ind => ind.id === link.ref);
          if (indicator) {
            const anchor = document.createElement('a');
            anchor.href = '#chart-' + indicator.id;
            anchor.dataset.ref = indicator.id;
            anchor.dataset.rangeStart = link.plage[0];
            anchor.dataset.rangeEnd = link.plage[1];
            anchor.textContent = indicator.label;
            // Separate anchors with comma if multiple
            if (idx > 0) para.appendChild(document.createTextNode(', '));
            para.appendChild(anchor);
          }
        }
      });
      article.appendChild(para);
      paragraphContainer.appendChild(article);
    });
  }

  /**
   * Render all charts defined in the data. Each chart is placed inside
   * a card element with a heading. Charts use the time scale and a
   * responsive layout. A custom tooltip shows the value with unit and
   * a short source note.
   *
   * @param {Array} indicateurs Array of indicator objects
   */
  function buildCharts(indicateurs) {
    // Register the annotation plugin globally
    if (window.Chart && window['chartjs-plugin-annotation']) {
      Chart.register(window['chartjs-plugin-annotation']);
    }

    indicateurs.forEach((indicator, idx) => {
      // Create card container
      const card = document.createElement('div');
      card.className = 'chart-card';
      // Title
      const heading = document.createElement('h2');
      heading.textContent = indicator.label;
      card.appendChild(heading);
      // Canvas
      const canvas = document.createElement('canvas');
      canvas.id = 'chart-' + indicator.id;
      card.appendChild(canvas);
      chartsContainer.appendChild(card);
      // Prepare dataset
      const dataPoints = indicator.series.map(pt => {
        // If date is YYYY (4 digits), treat as January 1st
        const dateStr = String(pt.date);
        let dateObj;
        if (/^\d{4}$/.test(dateStr)) {
          dateObj = new Date(dateStr + '-01-01');
        } else if (/^\d{4}-\d{2}$/.test(dateStr)) {
          dateObj = new Date(dateStr + '-01');
        } else {
          dateObj = new Date(dateStr);
        }
        return { x: dateObj, y: pt.val };
      });
      const colour = colourPalette[idx % colourPalette.length];
      // Helper to convert hex colour to RGBA string
      function hexToRgba(hex, alpha) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      const dataset = {
        label: indicator.label,
        id: indicator.id,
        data: dataPoints,
        borderColor: colour,
        backgroundColor: hexToRgba(colour, 0.2),
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      };
      // Determine chart type (bar for deficits, line otherwise)
      const chartType = indicator.series.some(pt => pt.val < 0) ? 'bar' : 'line';
      // Chart configuration
      const config = {
        type: chartType,
        data: { datasets: [dataset] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          parsing: false,
          // Enable smooth animation on load and update
          animation: {
            duration: 1200,
            easing: 'easeOutQuart'
          },
          // Interaction settings so tooltips appear even when not directly over a point
          interaction: {
            mode: 'nearest',
            intersect: false
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'year'
              },
              title: {
                display: true,
                text: 'Année'
              },
              grid: {
                color: 'rgba(200,200,200,0.2)'
              }
            },
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: indicator.unite
              },
              grid: {
                color: 'rgba(200,200,200,0.2)'
              }
            }
          },
          plugins: {
            legend: {
              display: false // hide default legend to save space
            },
            tooltip: {
              enabled: true,
              // Show tooltips when hovering near points
              intersect: false,
              callbacks: {
                title: (tooltipItems) => {
                  const date = tooltipItems[0].parsed.x;
                  const d = new Date(date);
                  return d.getFullYear().toString();
                },
                label: (ctx) => {
                  const val = ctx.parsed.y;
                  return `${indicator.label}: ${val} ${indicator.unite}`;
                },
                afterLabel: () => {
                  const src = indicator.source;
                  return `Source: ${src.media} (${src.date})`;
                }
              }
            },
            annotation: {
              annotations: {}
            }
          }
        }
      };
      // Create chart
      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, config);
      chartInstances[indicator.id] = chart;
    });
  }

  /**
   * Generate flip tiles from the tuiles array. Each tile shows a
   * consequence on the front and a solution, KPI, delay and impact on
   * the back. The KPI label is resolved via the indicateurs array.
   *
   * @param {Array} tuiles Array of tile objects
   * @param {Array} indicateurs Array of indicator objects
   */
  function buildTiles(tuiles, indicateurs) {
    tuiles.forEach(tile => {
      const card = document.createElement('div');
      card.className = 'flip-card';
      const inner = document.createElement('div');
      inner.className = 'flip-card-inner';
      // Front side
      const front = document.createElement('div');
      front.className = 'flip-card-front';
      const frontTitle = document.createElement('h3');
      frontTitle.textContent = tile.titre;
      const frontDesc = document.createElement('p');
      frontDesc.textContent = tile.consequence;
      front.appendChild(frontTitle);
      front.appendChild(frontDesc);
      // Back side
      const back = document.createElement('div');
      back.className = 'flip-card-back';
      const backTitle = document.createElement('h3');
      backTitle.textContent = tile.titre;
      const backSol = document.createElement('p');
      backSol.textContent = tile.solution;
      const backKPI = document.createElement('p');
      const indicator = indicateurs.find(ind => ind.id === tile.kpi);
      const label = indicator ? indicator.label : tile.kpi;
      backKPI.innerHTML = `<strong>KPI :</strong> ${label}`;
      const backDelai = document.createElement('p');
      backDelai.innerHTML = `<strong>Délai :</strong> ${tile.delai}`;
      const backImpact = document.createElement('p');
      backImpact.innerHTML = `<strong>Impact :</strong> ${tile.impact}`;
      back.appendChild(backTitle);
      back.appendChild(backSol);
      back.appendChild(backKPI);
      back.appendChild(backDelai);
      back.appendChild(backImpact);
      // Assemble
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      tilesContainer.appendChild(card);
    });
  }

  /**
   * Populate the list of sources. Indicator sources are added first,
   * followed by the extra sources array. Duplicate sources are
   * removed based on URL/title combinations.
   *
   * @param {Array} sources Array of additional sources
   * @param {Array} indicateurs Array of indicator objects
   */
  function buildSources(sources, indicateurs) {
    const allSources = [];
    // Add indicator sources
    indicateurs.forEach(ind => {
      if (ind.source) {
        allSources.push(ind.source);
      }
    });
    // Add extra sources
    sources.forEach(src => allSources.push(src));
    // Deduplicate by title and date
    const unique = [];
    allSources.forEach(src => {
      const exists = unique.some(u => u.titre === src.titre && u.date === src.date);
      if (!exists) unique.push(src);
    });
    // Append to list
    unique.forEach(src => {
      const li = document.createElement('li');
      const text = `${src.media} – ${src.titre} (${src.date})`;
      if (src.url) {
        const a = document.createElement('a');
        a.href = src.url;
        a.textContent = text;
        a.target = '_blank';
        li.appendChild(a);
      } else {
        li.textContent = text;
      }
      sourcesList.appendChild(li);
    });
  }

  /**
   * Add event listeners to the paragraph links. Hovering over a link
   * highlights the corresponding dataset and draws a shaded box over
   * the range defined in the link's plage. Leaving the link removes
   * the highlight. Clicking the link scrolls to the chart smoothly.
   */
  function wireParagraphInteractions() {
    const links = document.querySelectorAll('#paragraph-container a[data-ref]');
    links.forEach(link => {
      const ref = link.dataset.ref;
      const rangeStart = link.dataset.rangeStart;
      const rangeEnd = link.dataset.rangeEnd;
      link.addEventListener('mouseenter', () => {
        highlightSeries(ref, rangeStart, rangeEnd);
      });
      link.addEventListener('mouseleave', () => {
        unhighlightSeries(ref);
      });
      link.addEventListener('click', event => {
        event.preventDefault();
        // When clicking a paragraph link, switch to the "Graphiques"
        // section so the chart is visible, then scroll to the card.
        showSection('graphiques');
        const chartCard = document.getElementById('chart-' + ref)?.closest('.chart-card');
        if (chartCard) {
          chartCard.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Highlight a dataset on its chart and draw a shaded region between
   * start and end dates. Multiple highlights on the same chart will
   * overwrite previous range annotations for that dataset. Only the
   * targeted dataset is emphasised by increasing its border width.
   *
   * @param {string} ref Indicator id
   * @param {string} start Start date string (YYYY or YYYY-MM)
   * @param {string} end End date string (YYYY or YYYY-MM)
   */
  function highlightSeries(ref, start, end) {
    const chart = chartInstances[ref];
    if (!chart) return;
    // Emphasise dataset by increasing border width
    chart.data.datasets.forEach(ds => {
      ds.borderWidth = ds.id === ref ? 4 : 2;
    });
    // Prepare dates
    const startDate = parseDateToFirst(start);
    const endDate = parseDateToFirst(end);
    // Add or update annotation box
    const annId = 'range-' + ref;
    if (!chart.options.plugins.annotation) {
      chart.options.plugins.annotation = { annotations: {} };
    }
    chart.options.plugins.annotation.annotations[annId] = {
      type: 'box',
      xMin: startDate,
      xMax: endDate,
      backgroundColor: 'rgba(255, 193, 7, 0.15)',
      borderColor: 'rgba(255, 193, 7, 0.3)',
      borderWidth: 1
    };
    chart.update();
  }

  /**
   * Remove highlight and range annotation for a given indicator id.
   * Restores original border widths.
   *
   * @param {string} ref Indicator id
   */
  function unhighlightSeries(ref) {
    const chart = chartInstances[ref];
    if (!chart) return;
    chart.data.datasets.forEach(ds => {
      ds.borderWidth = 2;
    });
    const annId = 'range-' + ref;
    if (chart.options.plugins.annotation && chart.options.plugins.annotation.annotations) {
      delete chart.options.plugins.annotation.annotations[annId];
    }
    chart.update();
  }

  /**
   * Convert a date string (YYYY or YYYY-MM) into a Date object
   * representing the first day of that period. If the string is
   * already a full date, it is passed to the Date constructor.
   *
   * @param {string} str Date string
   * @returns {Date}
   */
  function parseDateToFirst(str) {
    if (/^\d{4}$/.test(str)) {
      return new Date(str + '-01-01');
    }
    if (/^\d{4}-\d{2}$/.test(str)) {
      return new Date(str + '-01');
    }
    return new Date(str);
  }

  /**
   * Initialise tabbed navigation. Each link in the nav bar references
   * a section id via its href attribute (e.g. #synthese). On click,
   * all other sections are hidden and the selected section is shown.
   * The active nav link receives the class 'active'. By default, the
   * first nav link's target section is displayed on page load.
   */
  function setupTabs() {
    const navLinks = document.querySelectorAll('.nav a[href^="#"]');
    const sections = document.querySelectorAll('section');
    if (navLinks.length === 0) return;
    // Hide all sections initially except the first target
    sections.forEach((sec, index) => {
      if (index === 0) {
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });
    // Set first nav as active
    navLinks.forEach((link, idx) => {
      if (idx === 0) link.classList.add('active');
    });
    navLinks.forEach(link => {
      link.addEventListener('click', evt => {
        // Only handle internal section links
        if (!link.getAttribute('href').startsWith('#')) return;
        evt.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        showSection(targetId);
      });
    });
  }

  /**
   * Show a section by id and hide all other sections. Also marks the
   * corresponding navigation link as active. If no section matches
   * the id, nothing happens.
   *
   * @param {string} id Section id to show
   */
  function showSection(id) {
    const sections = document.querySelectorAll('section');
    sections.forEach(sec => {
      if (sec.id === id) {
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });
    // Update nav link active state
    const navLinks = document.querySelectorAll('.nav a[href^="#"]');
    navLinks.forEach(link => {
      const linkTarget = link.getAttribute('href').substring(1);
      if (linkTarget === id) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
});