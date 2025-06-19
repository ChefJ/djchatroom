const qualitativeLabels = [['Very', 'Negative'], 'Negative', ['Somewhat', 'Negative'], 'Neutral', ['Somewhat', 'Positive'], 'Positive', ['Very', 'Positive']];

Chart.register({
    id: 'backgroundTitle',
/*    beforeDraw(chart, args, options) {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.font = options.font || 'bold 28px sans-serif';
        ctx.fillStyle = options.color || 'rgba(0,0,0,0.05)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.text || '', width / 2 + 20, height / 2 - 10    );
        ctx.restore();
    }*/
});


function renderSentimentPolarityBar(scores) {
    const {labels, normalized} = getCompoundBins(scores, globalBinAmount);

    let posSum = 0, negSum = 0;
    normalized.forEach((val, i) => {
        const score = parseFloat(labels[i]);
        if (score > 0) posSum += val;
        if (score < 0) negSum += val;
    });

    const textBox = document.getElementById('polarity-text-description');
    if (textBox) {
        const posPercent = Math.round(posSum);
        const negPercent = Math.round(negSum);

        const comparison = posPercent > negPercent
            ? "The green paragraph is overall more positive."
            : posPercent < negPercent
                ? "The red paragraph is overall more negative."
                : "The sentiment is evenly balanced.";

        textBox.innerHTML = `
        The <span style="color:red">red</span> paragraph has ${negPercent}% tendency of being positive.<br>
        The <span style="color:green">green</span> paragraph has ${posPercent}% tendency of being positive.<br>
        ${comparison}
    `;
    }

    const ctx = document.getElementById('polarity-bar-chart').getContext('2d');
    if (chartRefs['polarityBar']) chartRefs['polarityBar'].destroy();

    chartRefs['polarityBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Polarity'],
            datasets: [
                {
                    label: 'Negative',
                    data: [negSum],
                    backgroundColor: 'rgba(255, 80, 80, 0.7)',
                    stack: 'sentiment'
                },
                {
                    label: 'Positive',
                    data: [posSum],
                    backgroundColor: 'rgba(0, 255, 153, 0.7)',
                    stack: 'sentiment'
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    min: -100,
                    max: 100,
                    title: {display: true, text: 'Percentage of Sentiment Area (%)', color: glbTextColor, },
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor, display:false}
                },
                y: {
                    stacked: true,
                    ticks: {color: glbTextColor},
                    grid: {display: false}
                }
            },
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false,
                    labels: {
                        color: glbTextColor
                    }
                },
                title: {
                    display: true,
                    text: 'Sentiment Polarity Balance',
                    color: glbTextColor,
                    font: {size: 14, weight: 'bold'}
                }
            }
        }
    });
}

function getCompoundBins(scores, binCount = globalBinAmount) {
    const binWidth = 2 / binCount; // from -1 to 1
    const bins = Array(binCount).fill(0);
    const total = scores.length;

    scores.forEach(s => {
        const compound = s.compound;
        const index = Math.min(Math.floor((compound + 1) / binWidth), binCount - 1);
        bins[index]++;
    });

    const normalized = bins.map(count => (count / total) * 100);
    const labels = Array.from({length: binCount}, (_, i) =>
        (-(1 - binWidth / 2) + i * binWidth).toFixed(2)
    );

    return {labels, normalized};
}


function highlightSentimentSegmentsByBin(binIndex, binCount = globalBinAmount) {
    const binWidth = 2 / binCount;
    const binStart = -1 + binIndex * binWidth;
    const binEnd = binStart + binWidth;

    // 🧠 Now highlight spans from ALL compared messages
    const comparedIds = Object.keys(comparedMessages);
    comparedIds.forEach(msgId => {
        const bubble = document.querySelector(`[data-id="${msgId}"]`);
        if (!bubble) return;


        const spans = bubble.querySelectorAll('.sentiment-segment');
        spans.forEach(span => {
            const score = parseFloat(span.dataset.compound);
            if (score >= binStart && score < binEnd) {
                span.classList.add('highlight-segment');
            }
        });
    });
/*    sendLog({"trigger":"hover_sentiment_curve",
        "input_value":"",
        "event_goal":"Find related sentences",
        "goal_fulfilled":true});*/
}

function highlightChartBarsByBin(binIndex, binCount = globalBinAmount) {
    ['compoundBar', 'compoundCurve'].forEach(chartKey => {
        const chart = chartRefs[chartKey];
        if (!chart) return;

        chart.data.datasets.forEach(dataset => {
            const originalColor = dataset.originalColor || dataset.backgroundColor || 'rgba(75,192,192,0.6)';
            dataset.originalColor = originalColor;

            dataset.backgroundColor = dataset.data.map((_, i) =>
                i === binIndex ? originalColor : originalColor.replace(/[\d.]+\)$/g, '0.3)')
            );

            if (chart.config.type === 'line') {
                dataset.borderColor = dataset.data.map((_, i) =>
                    i === binIndex ? originalColor : originalColor.replace(/[\d.]+\)$/g, '0.3)')
                );
            }
        });

        chart.update();
    });
}

function removeSegmentHighlights() {
    const comparedIds = Object.keys(comparedMessages);
    comparedIds.forEach(msgId => {
        const bubble = document.querySelector(`[data-id="${msgId}"]`);
        if (!bubble) return;

        const spans = bubble.querySelectorAll('.sentiment-segment.highlight-segment');
        spans.forEach(span => {
            span.classList.remove('highlight-segment');
        });
    });
}

function removeBarHighlights() {
    // 🌐 Text span cleanup
    const comparedIds = Object.keys(comparedMessages);
    comparedIds.forEach(msgId => {
        const bubble = document.querySelector(`[data-id="${msgId}"]`);
        if (!bubble) return;

        const spans = bubble.querySelectorAll('.sentiment-segment.highlight-segment');
        spans.forEach(span => span.classList.remove('highlight-segment'));
    });

    // 📊 Chart visual reset
    ['compoundCurve', 'compoundBar'].forEach(chartKey => {
        const chart = chartRefs[chartKey];
        if (!chart) return;

        chart.data.datasets.forEach(dataset => {
            const originalColor = dataset.originalColor || 'rgba(75,192,192,0.6)';
            dataset.backgroundColor = dataset.data.map(() => originalColor);

            if (chart.config.type === 'line') {
                dataset.borderColor = originalColor;
            }
        });

        chart.update();
    });
}

function renderSentimentDistributionChart(scores, canvasId = 'compound-curve-chart', binCount = 20) {
    const compoundScores = scores.map(s => s.compound);
    const binWidth = 2 / binCount;
    const bins = Array(binCount).fill(0);

    compoundScores.forEach(score => {
        const index = Math.min(Math.floor((score + 1) / binWidth), binCount - 1);
        bins[index]++;
    });

    const total = compoundScores.length;
    const normalizedBins = bins.map(count => (count / total) * 100);
    const labels = Array.from({length: binCount}, (_, i) =>
        (-(1 - binWidth / 2) + i * binWidth).toFixed(2)
    );

    const ctx = document.getElementById(canvasId).getContext('2d');
    if (chartRefs['compoundCurve']) {
        chartRefs['compoundCurve'].destroy();
    }

    chartRefs['compoundCurve'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Compound Score Distribution',
                data: normalizedBins,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                pointRadius: (ctx) => {
                    const ds = ctx.chart.data.datasets[ctx.datasetIndex];
                    return ctx.dataIndex === ds.highlightedIndex ? 6 : 2;
                },
                pointBackgroundColor: (ctx) => {
                    const ds = ctx.chart.data.datasets[ctx.datasetIndex];
                    return ctx.dataIndex === ds.highlightedIndex ? 'orange' : 'rgba(75,192,192,1)';
                }
            }]
        },
        options: {

            responsive: true,
        onHover: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                highlightChartBarsByBin(index);
                highlightSentimentSegmentsByBin(index);
            } else {
                removeSegmentHighlights();
                removeBarHighlights();
            }
        },
            scales: {
                x: {
                    title: {
                        display: false,
                        text: 'Sentiment Distribution Curve',
                        color: glbTextColor,
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            top: 20,
                            bottom: 10
                        }
                    },
                    ticks: {color: glbTextColor,callback: function(value, index) {
                            return qualitativeLabels[index] || '';
                        }},
                    grid: {color: glbGridColor,display:false},
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {display: false, text: 'Percentage (%)'},
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor,display:false}
                }
            },
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false,
                    labels: {
                        color: glbTextColor
                    }
                }
            }
        }
    });
}

function renderSentimentBarChart(scores, canvasId = 'compound-bar-chart', binCount = 20) {
    const compoundScores = scores.map(s => s.compound);
    const binWidth = 2 / binCount;
    const bins = Array(binCount).fill(0);

    compoundScores.forEach(score => {
        const index = Math.min(Math.floor((score + 1) / binWidth), binCount - 1);
        bins[index]++;
    });

    const total = compoundScores.length;
    const normalizedBins = bins.map(count => (count / total) * 100);
    const labels = Array.from({length: binCount}, (_, i) =>
        (-(1 - binWidth / 2) + i * binWidth).toFixed(2)
    );

    const ctx = document.getElementById(canvasId).getContext('2d');
    if (chartRefs['compoundBar']) {
        chartRefs['compoundBar'].destroy();
    }

    chartRefs['compoundBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Compound Score Distribution (Bar)',
                data: normalizedBins,
                backgroundColor: 'rgba(75,192,192,0.6)',
                borderColor: 'rgba(75,192,192,1)',
                borderWidth: 1
            }]
        },
        options: {

            responsive: true,
            onHover: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    highlightChartBarsByBin(index);
                    highlightSentimentSegmentsByBin(index);
                } else {
                    removeSegmentHighlights();
                    removeBarHighlights();
                }
            },
            scales: {
                x: {
                    title: {display: true, text: 'Compound Sentiment Score'},
                    ticks: {color: glbTextColor,
                        callback: function(value, index) {
                            return qualitativeLabels[index] || '';
                        },
                        autoSkip: false},
                    grid: {color: glbGridColor}
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {display: false, text: 'Percentage (%)'},
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor}
                }
            },
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false,
                    labels: {
                        color: glbTextColor
                    }
                },

            }
        }
    });
}

function highlightChartBin(bubble, score, binCount = globalBinAmount) {
    const binWidth = 2 / binCount;
    const index = Math.min(Math.floor((score + 1) / binWidth), binCount - 1);
    const msgId = bubble.dataset.id;

    console.log('Hovering on message:'+msgId);
    ['compoundCurve', 'compoundBar'].forEach(chartKey => {
        const chart = chartRefs[chartKey];
        if (!chart) return;

        chart.data.datasets.forEach((dataset, datasetIndex) => {
            console.log('Chart label:'+dataset.label);
            const originalColor = dataset.originalColor || 'rgba(75,192,192,0.6)';
            const fadedColor = originalColor.replace(/[\d.]+\)$/g, '0.1)');

            dataset.backgroundColor = dataset.data.map((_, i) =>{
                    if(i === index)
                        if(msgId===dataset.label) return originalColor;
                        else return fadedColor;
                    else
                        return fadedColor;
                }
            );

            if (chart.config.type === 'line') {

                dataset.borderColor = dataset.data.map((_, i) =>{
                        if(i === index)
                            if(msgId===dataset.label) return originalColor;
                            else return fadedColor;
                        else
                            return fadedColor;
                    }
                );

                dataset.pointRadius =  dataset.data.map((_, i) =>{
                        if(i === index)
                            if(msgId===dataset.label) return 6;
                            else return 3;
                        else
                            return 3;
                    }
                );
                // 🔥 Set the highlighted point index (this is the new part)
                dataset.highlightedIndex = index;
            }
        });

        chart.update(); // no reanimation
    });
}
function removeChartHighlights() {
    ['compoundCurve', 'compoundBar'].forEach(chartKey => {
        const chart = chartRefs[chartKey];
        if (!chart) return;

        chart.data.datasets.forEach(dataset => {
            const originalColor = dataset.originalColor || 'rgba(75,192,192,0.6)';
            dataset.backgroundColor = dataset.data.map(() => originalColor);

            if (chart.config.type === 'line') {
                dataset.borderColor = originalColor;

                dataset.pointRadius =  dataset.data.map((_, i) =>{

                    return 3;
                    }
                );

                // ❌ Clear the index
                delete dataset.highlightedIndex;
            }
        });

        chart.update('none');
    });
}


function renderMultiSentimentDistributionChart(datasets, canvasId = 'compound-curve-chart') {
    const labels = Array.from({length: globalBinAmount}, (_, i) => (-(1 - (1/globalBinAmount)/2) + i * (2/globalBinAmount)).toFixed(2));
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartRefs['compoundCurve']) chartRefs['compoundCurve'].destroy?.();

    // 🧠 Save original colors
    datasets.forEach(ds => {
        ds.originalColor = ds.borderColor || 'rgba(75,192,192,0.6)';
    });

    chartRefs['compoundCurve'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            onHover: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    highlightChartBarsByBin(index);
                    highlightSentimentSegmentsByBin(index);
                } else {
                    removeSegmentHighlights();
                    removeBarHighlights();
                }
            },
            scales: {
                x: {             title: {
                        display: false,
                        text: 'Sentiment Distribution Curve',
                        color: '#000',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: {
                            top: 20,
                            bottom: 10
                        }
                    }, ticks: { color: '#000',callback: function(value, index) {
                            return qualitativeLabels[index] || '';
                        } }, grid: { color: '#aaa',display:false } },
                y: { title: { display: false, text: 'Percentage (%)' }, beginAtZero: true, max: 100,ticks: { color: '#aaa',callback: value => `${value}%`}, grid: { color: '#aaa' } }
            },
            plugins: {
                backgroundTitle: {
                    text: 'Sentiment Distribution Curve',
                    font: 'bold 18px Courier Prime',
                    color: '#aaa'
                },
                tooltip: {
                    enabled: false
                },
                legend: { display: false,
                    labels: { color: glbTextColor } }
            }
        }
    });
}

function renderMultiSentimentBarChart(datasets, canvasId = 'compound-bar-chart') {
    const labels = Array.from({length: globalBinAmount}, (_, i) => (-(1 - (1/globalBinAmount)/2) + i * (2/globalBinAmount)).toFixed(2));
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartRefs['compoundBar']) chartRefs['compoundBar'].destroy?.();

    // 🧠 Save original colors
    datasets.forEach(ds => {
        ds.originalColor = ds.backgroundColor || 'rgba(75,192,192,0.6)';
    });

    chartRefs['compoundBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            onHover: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    highlightChartBarsByBin(index);
                    highlightSentimentSegmentsByBin(index);
                } else {
                    removeSegmentHighlights();
                    removeBarHighlights();
                }
            },
            scales: {
                x: { title: { display: false, text: 'Compound Score' }, ticks: { color: '#000', autoSkip: false,callback: function(value, index) {
                            return qualitativeLabels[index] || '';
                        } },  grid: { color: '#aaa',display:false } },
                y: { title: { display: false, text: 'Percentage (%)' }, beginAtZero: true,max: 100, ticks: { color: '#aaa' ,callback: value => `${value}%`}, grid: { color: '#aaa' } }
            },
            plugins: {
                backgroundTitle: {
                    text: 'Sentiment Bar',
                    font: 'bold 28px Courier Prime',
                    color: '#aaa'
                },
                tooltip: {
                    enabled: false
                },
                legend: {display: false,
                    labels: { color: glbTextColor } }
            }
        }
    });
}

function renderMultiSentimentPolarityChart(datasets, labels,canvasId = 'polarity-bar-chart') {

    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartRefs['polarityBar']) chartRefs['polarityBar'].destroy?.();

    chartRefs['polarityBar'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: {
                    title: {
                        display: true  ,
                        text: 'Negative Tendency ← | → Positive Tendency',
                        color: '#000',
                        font: {size: 14, weight: 'bold'}},
                    beginAtZero: true,
                    min: -100,
                    max: 100,
                    ticks:  { color: '#aaa' ,
                        callback: value => `${value}%`
                    },
                    grid: { color: '#aaa' }
                },
                y: {
                    ticks: { color: '#aaa', display:false },
                    grid: { color: '#aaa' }
                }
            },
            plugins: {
                tooltip: {
                    enabled: false
                },
                backgroundTitle: {
                    text: 'Sentiment Polarity',
                    font: 'bold 18px Courier Prime',
                    color: '#aaa'                },
                legend: {display: false,
                    labels: { color: glbTextColor } }
            }
        }
    });
}

function generateColorPalette(n) {
    const defaultPalette = [
        'rgba(54, 162, 235, 0.8)',   // Blue
        'rgba(255, 159, 64, 0.8)',   // Orange
        'rgba(200, 200, 0, 0.8)',    // Olive
        'rgba(153, 102, 255, 0.8)',  // Purple

        'rgba(255, 206, 86, 0.8)',   // Yellow
        'rgba(75, 192, 192, 0.8)',   // Teal
        'rgba(255, 100, 255, 0.8)',  // Pink
        'rgba(0, 200, 200, 0.8)'     // Aqua
    ];

    const colorBlindPalette = [
/*        'rgba(0, 0, 255, 0.8)',      // Blue
        'rgba(255, 165, 0, 0.8)',    // Orange*/
        'rgba(0, 128, 128, 0.8)',    // Teal
/*
        'rgba(128, 0, 128, 0.8)',    // Purple
*/
        'rgba(100, 100, 0, 0.8)',    // Olive green
        'rgba(0, 100, 255, 0.8)',    // Strong blue
        'rgba(255, 200, 0, 0.8)',    // Gold
        'rgba(128, 128, 0, 0.8)'     // Mustard
    ];

    const palette = document.body.classList.contains('colorblind')
        ? colorBlindPalette
        : defaultPalette;

    // Repeat or trim if needed
    while (palette.length < n) {
        palette.push(palette[palette.length % defaultPalette.length]);
    }

    return palette.slice(0, n);
}
function lightenColor(color, factor) {
    // Simple lighten: reduce alpha
    return color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^,]+)\)/, (match, r, g, b, a) => {
        return `rgba(${r},${g},${b},${parseFloat(a) * factor})`;
    });
}

function rgbaFromVar(cssVarName, alpha) {
    const rgb = getComputedStyle(document.querySelector('body')).getPropertyValue(cssVarName).trim();
    return `rgba(${rgb}, ${alpha})`;
}

function rerenderActiveSentiment() {
    const bubble = window.__activeSentimentMessage;
    if (!bubble || !bubble.__messageWithScores) return;

    try {
        const segments = document.querySelectorAll('.sentiment-segment');

        segments.forEach(seg => {
            const compound = parseFloat(seg.dataset.compound);
            const alpha = Math.min(Math.abs(compound), 1).toFixed(2);

            let bgColor = '';
            if (compound > 0) {
                bgColor = rgbaFromVar('--positive-color', alpha);
            } else if (compound < 0) {
                bgColor = rgbaFromVar('--negative-color', alpha);
            }

            seg.style.backgroundColor = bgColor;
        });
    } catch (err) {
        console.warn('🧠 Failed to re-render sentiment:', err);
    }
}


