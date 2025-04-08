function renderSentimentPolarityBar(scores) {
    const {labels, normalized} = getCompoundBins(scores, 20);

    let posSum = 0, negSum = 0;
    normalized.forEach((val, i) => {
        const score = parseFloat(labels[i]);
        if (score > 0) posSum += val;
        if (score < 0) negSum += val;
    });

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
                    max: 100,
                    title: {display: true, text: 'Percentage of Sentiment Area (%)', color: glbTextColor},
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor}
                },
                y: {
                    stacked: true,
                    ticks: {color: glbTextColor},
                    grid: {display: false}
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`
                    }
                },
                legend: {
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

function getCompoundBins(scores, binCount = 20) {
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

function renderSentimentCharts(scores) {
    const bins = Array(10).fill(0).map((_, i) => `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`);
    const negCounts = Array(10).fill(0);
    const neuCounts = Array(10).fill(0);
    const posCounts = Array(10).fill(0);
    let posCount = 0, negCount = 0, posSum = 0, negSum = 0;

    scores.forEach(s => {
        const getBin = v => Math.min(9, Math.floor(v * 10));
        if (s.neg > 0) negCounts[getBin(s.neg)]++;
        if (s.neu > 0) neuCounts[getBin(s.neu)]++;
        if (s.pos > 0) posCounts[getBin(s.pos)]++;

        if (s.pos > 0) {
            posCount++;
            posSum += s.pos;
        }
        if (s.neg > 0) {
            negCount++;
            negSum += s.neg;
        }
    });


    function createChart(canvasId, label, data, color, chartKey, isHorizontal = false) {
        const ctx = document.getElementById(canvasId).getContext('2d');

// Destroy existing chart before creating a new one
        if (chartRefs[chartKey]) {
            chartRefs[chartKey].destroy();
        }

        const baseOptions = {
            type: 'bar',
            options: {
                indexAxis: isHorizontal ? 'y' : 'x',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {color: 'rgba(128,128,128,0.7)'},
                        grid: {display: 'rgba(128,128,128,0.7)'}
                    },
                    y: {
                        ticks: {color: 'rgba(128,128,128,0.7)'},
                        grid: {display: false}
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: label,
                        color: 'rgba(128,128,128,0.7)',
                        font: {size: 14, weight: 'bold'},
                        padding: {top: 10, bottom: 10}
                    },
                    legend: {
                        display: false
                    }
                }
            },
            data: {
                labels: isHorizontal ? [''] : bins,
                datasets: [{
                    label,
                    data,
                    backgroundColor: color
                }]
            }
        };

        chartRefs[chartKey] = new Chart(ctx, baseOptions);
    }


    createChart('neg-chart', 'Negative', negCounts, 'rgba(255,80,80,0.7)', 'neg');
    createChart('neu-chart', 'Neutral', neuCounts, 'rgba(128,128,128,0.7)', 'neu');
    createChart('pos-chart', 'Positive', posCounts, 'rgba(0,255,153,0.7)', 'pos');
// createChart('ratio-bar', 'Sentence Count: Negative vs Positive', [negCount, posCount], ['rgba(255,80,80,0.7)', 'rgba(0,255,153,0.7)'], 'ratio', true);
// createChart('sum-bar', 'Sum of Sentiment Scores', [negSum.toFixed(2), posSum.toFixed(2)], ['rgba(255,80,80,0.7)', 'rgba(0,255,153,0.7)'], 'sum', true);

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
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {display: true, text: 'Compound Sentiment Score'},
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor}
                },
                y: {
                    beginAtZero: true,
                    title: {display: true, text: 'Percentage (%)'},
                    ticks: {color: glbTextColor},
                    grid: {color: glbGridColor}
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.raw.toFixed(2)}%`
                    }
                },
                legend: {
                    labels: {
                        color: glbTextColor
                    }
                }
            }
        }
    });
}

