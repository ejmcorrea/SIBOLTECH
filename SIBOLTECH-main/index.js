document.addEventListener('DOMContentLoaded', ()=>{
	const burger = document.getElementById('burger');
	const sidebar = document.getElementById('sidebar');
	const tabs = document.querySelectorAll('[data-tab]');
	const contents = document.querySelectorAll('.tab-content');

	// Toggle sidebar (collapse/expand on desktop, open/close on mobile)
	burger.addEventListener('click', ()=>{
		// For mobile (small screens), use 'open' class for slide in/out
		if(window.innerWidth <= 900){
			sidebar.classList.toggle('open');
		} else {
			// For desktop, use 'collapsed' class for collapse/expand
			sidebar.classList.toggle('collapsed');
			// Add/remove body class for global styling adjustments
			document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
		}
	});

	// Tab switching
	tabs.forEach(a=>{
		a.addEventListener('click', (e)=>{
			e.preventDefault();
			const t = a.getAttribute('data-tab');
			document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));
			a.classList.add('active');
			contents.forEach(c=>c.classList.remove('active'));
			const target = document.getElementById(t);
			if(target) target.classList.add('active');
			
			// Show/hide prediction dropdown in sidebar
			const predMetricSelect = document.getElementById('predictionMetric');
			if(t === 'predicting' && predMetricSelect){
				predMetricSelect.style.display = 'block';
			} else if(predMetricSelect){
				predMetricSelect.style.display = 'none';
			}
			
			// close mobile sidebar after selection
			if(window.innerWidth <= 900) sidebar.classList.remove('open');
			// If calibrate selected, focus first input
			if(t === 'calibrate'){
				setTimeout(()=>document.getElementById('calSensor')?.focus(),200);
			}
		});
	});

	// Training: dynamic plants
	const addPlantBtn = document.getElementById('addPlant');
	const plantList = document.getElementById('plantList');
	let plantCounter = 0;

	function createPlantNode(idx){
		const wrapper = document.createElement('div');
		wrapper.className = 'plant';
		wrapper.dataset.index = idx;

		const title = document.createElement('h4');
		title.textContent = `Plant #${idx}`;
		wrapper.appendChild(title);

		const fields = [
			['Number of leaves','leaves'],
			['Length of plant','length'],
			['Weight of plant','weight'],
			['Height','height'],
			['Number of branches','branches']
		];

		fields.forEach(([label,name])=>{
			const row = document.createElement('div'); row.className='form-row';
			const lab = document.createElement('label'); lab.textContent = label;
			const inp = document.createElement('input'); inp.type='number'; inp.name = `${name}_${idx}`; inp.step='0.01';
			row.appendChild(lab); row.appendChild(inp);
			wrapper.appendChild(row);
		});

		const remove = document.createElement('button'); remove.textContent='Remove';
		remove.addEventListener('click', ()=>{ wrapper.remove(); updatePlantNumbers(); });
		wrapper.appendChild(remove);

		return wrapper;
	}

	function updatePlantNumbers(){
		const plants = Array.from(plantList.querySelectorAll('.plant'));
		plants.forEach((p,i)=>{
			p.dataset.index = i+1;
			const h = p.querySelector('h4'); if(h) h.textContent = `Plant #${i+1}`;
			// rename inputs
			p.querySelectorAll('input').forEach(inp=>{
				const parts = inp.name.split('_');
				parts[parts.length-1] = (i+1);
				inp.name = parts.join('_');
			});
		});
		plantCounter = plants.length;
	}

	addPlantBtn.addEventListener('click', ()=>{
		plantCounter += 1;
		const node = createPlantNode(plantCounter);
		plantList.appendChild(node);
	});

	// Show/hide sensor inputs depending on system
	const systemSelect = document.getElementById('systemSelect');
	const sensorParams = document.getElementById('sensorParams');
	function updateSystemUI(){
		const val = systemSelect.value;
		if(val === 'Traditional'){
			sensorParams.style.display = 'none';
		} else {
			sensorParams.style.display = 'block';
		}
	}
	if(systemSelect && sensorParams) {
		systemSelect.addEventListener('change', updateSystemUI);
		updateSystemUI();
	}

	// Home dashboard: draw growth chart and mini graphs, populate sensor values
	const growthCanvas = document.getElementById('growthChart');
	
	// randomWalk function - accessible globally
	window.randomWalk = function(len, base=30, amp=10){
		const a=[]; let v=base; for(let i=0;i<len;i++){ v += (Math.random()-0.45)*amp; a.push(v); } return a;
	};

	function drawLine(ctx, data, color, leftPad, rightPad, topPad, bottomPad, width=2){
		const w = ctx.canvas.width, h = ctx.canvas.height;
		const plotW = w - leftPad - rightPad;
		const plotH = h - topPad - bottomPad;
		ctx.beginPath();
		const min = 0; const max = 100; // fixed scale for growth prediction (0-100)
		data.forEach((val,i)=>{
			const x = leftPad + (i/(data.length-1))*plotW;
			const y = topPad + (1 - (val - min) / (max - min || 1)) * plotH;
			if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
		});
		ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
	}

	function drawGrowth(){
		if(!growthCanvas || !growthCanvas.getContext) return;
		
		// Get container dimensions for responsive canvas
		const container = growthCanvas.parentElement;
		if(!container) return;
		
		const containerRect = container.getBoundingClientRect();
		const containerWidth = containerRect.width - 32; // subtract padding (16px * 2)
		const containerHeight = containerRect.height - 32; // subtract padding (16px * 2)
		
		// Set canvas dimensions to match container
		growthCanvas.width = containerWidth;
		growthCanvas.height = containerHeight;
		
		const ctx = growthCanvas.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		
		const w = growthCanvas.width, h = growthCanvas.height;
		ctx.clearRect(0, 0, w, h);
		// Background is handled by container
		
		const leftPad = 50, rightPad = 20, topPad = 20, bottomPad = 40;

		// draw horizontal grid lines and y-axis ticks
		const ticks = [0, 25, 50, 75, 100];
		ctx.fillStyle = '#6c7380';
		ctx.font = '11px Segoe UI, Arial, sans-serif';
		ctx.textAlign = 'right';
		
		ticks.forEach(val => {
			const y = topPad + (1 - (val/100)) * (h - topPad - bottomPad);
			
			// Grid line
			ctx.strokeStyle = '#e8ecf4';
			ctx.lineWidth = 1;
			ctx.setLineDash([5, 5]);
			ctx.beginPath();
			ctx.moveTo(leftPad, y);
			ctx.lineTo(w - rightPad, y);
			ctx.stroke();
			ctx.setLineDash([]);
			
			// Y-axis label
			ctx.fillText(val + '%', leftPad - 12, y + 4);
		});

		// draw vertical grid lines
		ctx.strokeStyle = '#f0f4f8';
		ctx.lineWidth = 1;
		for(let i = 0; i <= 6; i++){
			const x = leftPad + (i/6) * (w - leftPad - rightPad);
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(x, topPad);
			ctx.lineTo(x, h - bottomPad);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// sample data
		const predicted = randomWalk(30, 60, 6).map(v => Math.max(0, Math.min(100, v)));
		const actual = predicted.map((v, i) => Math.max(0, Math.min(100, v - (Math.random() * 6))));

		const plotW = w - leftPad - rightPad;
		const plotH = h - topPad - bottomPad;
		
		// Helper function to create smooth curve points
		function createSmoothPoints(data) {
			const points = [];
			data.forEach((val, i) => {
				const x = leftPad + (i / (data.length - 1)) * plotW;
				const y = topPad + (1 - (val / 100)) * plotH;
				points.push({x, y, val});
			});
			return points;
		}
		
		const actualPoints = createSmoothPoints(actual);
		const predictedPoints = createSmoothPoints(predicted);
		
		// Draw actual line with gradient fill
		ctx.beginPath();
		actualPoints.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = actualPoints[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(actualPoints[actualPoints.length - 1].x, actualPoints[actualPoints.length - 1].y, 
			actualPoints[actualPoints.length - 1].x, actualPoints[actualPoints.length - 1].y);
		ctx.lineTo(actualPoints[actualPoints.length - 1].x, h - bottomPad);
		ctx.lineTo(actualPoints[0].x, h - bottomPad);
		ctx.closePath();
		
		const actualGradient = ctx.createLinearGradient(leftPad, topPad, leftPad, h - bottomPad);
		actualGradient.addColorStop(0, 'rgba(154, 164, 184, 0.15)');
		actualGradient.addColorStop(1, 'rgba(154, 164, 184, 0)');
		ctx.fillStyle = actualGradient;
		ctx.fill();
		
		// Draw actual line
		ctx.beginPath();
		actualPoints.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = actualPoints[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(actualPoints[actualPoints.length - 1].x, actualPoints[actualPoints.length - 1].y,
			actualPoints[actualPoints.length - 1].x, actualPoints[actualPoints.length - 1].y);
		ctx.strokeStyle = '#9aa4b8';
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
		
		// Draw predicted line with gradient fill
		ctx.beginPath();
		predictedPoints.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = predictedPoints[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(predictedPoints[predictedPoints.length - 1].x, predictedPoints[predictedPoints.length - 1].y,
			predictedPoints[predictedPoints.length - 1].x, predictedPoints[predictedPoints.length - 1].y);
		ctx.lineTo(predictedPoints[predictedPoints.length - 1].x, h - bottomPad);
		ctx.lineTo(predictedPoints[0].x, h - bottomPad);
		ctx.closePath();
		
		const predictedGradient = ctx.createLinearGradient(leftPad, topPad, leftPad, h - bottomPad);
		predictedGradient.addColorStop(0, 'rgba(43, 110, 246, 0.2)');
		predictedGradient.addColorStop(1, 'rgba(43, 110, 246, 0)');
		ctx.fillStyle = predictedGradient;
		ctx.fill();
		
		// Draw predicted line
		ctx.beginPath();
		predictedPoints.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = predictedPoints[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(predictedPoints[predictedPoints.length - 1].x, predictedPoints[predictedPoints.length - 1].y,
			predictedPoints[predictedPoints.length - 1].x, predictedPoints[predictedPoints.length - 1].y);
		ctx.strokeStyle = '#2b6ef6';
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.shadowColor = 'rgba(43, 110, 246, 0.3)';
		ctx.shadowBlur = 6;
		ctx.stroke();
		ctx.shadowBlur = 0;
		
		// Draw data points
		[actualPoints, predictedPoints].forEach((points, idx) => {
			const color = idx === 0 ? '#9aa4b8' : '#2b6ef6';
			points.forEach((point, i) => {
				if(i % 5 === 0 || i === points.length - 1) {
					ctx.beginPath();
					ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
					ctx.fillStyle = '#ffffff';
					ctx.fill();
					ctx.strokeStyle = color;
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			});
		});
		
		// X-axis labels
		ctx.fillStyle = '#9aa4b8';
		ctx.font = '10px Segoe UI, Arial, sans-serif';
		ctx.textAlign = 'center';
		const days = ['Day 1', 'Day 10', 'Day 20', 'Day 30'];
		days.forEach((day, i) => {
			const x = leftPad + (i / (days.length - 1)) * plotW;
			ctx.fillText(day, x, h - bottomPad + 20);
		});
	}

	function drawMini(id){
		const c = document.getElementById(id); if(!c || !c.getContext) return;
		
		// Get container dimensions for responsive canvas
		const container = c.parentElement; // mini-canvas-wrapper
		if(!container) return;
		
		const containerRect = container.getBoundingClientRect();
		const containerWidth = containerRect.width;
		const containerHeight = containerRect.height;
		
		// Set canvas dimensions to match container
		c.width = containerWidth;
		c.height = containerHeight;
		
		const ctx = c.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		
		const w = c.width, h = c.height;
		ctx.clearRect(0, 0, w, h);
		// Background handled by wrapper
		
		const leftPad = Math.max(35, w * 0.15), rightPad = 8, topPad = 8, bottomPad = 8;
		
		// Determine base values based on sensor type
		let baseVal, unit, currentVal;
		if(id === 'mini1') { // DO
			baseVal = 7 + Math.random() * 2;
			unit = ' mg/L';
			currentVal = baseVal.toFixed(1);
		} else if(id === 'mini2') { // pH
			baseVal = 6 + Math.random() * 0.8;
			unit = ' pH';
			currentVal = baseVal.toFixed(2);
		} else { // Temperature
			baseVal = 24 + Math.random() * 3;
			unit = ' °C';
			currentVal = baseVal.toFixed(1);
		}
		
		// Update value display
		const valueEl = document.getElementById(id + '-value');
		if(valueEl) {
			valueEl.textContent = currentVal + unit;
		}
		
		const data = randomWalk(20, baseVal, baseVal * 0.15);
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;

		// Draw smooth line with gradient fill
		const plotW = w - leftPad - rightPad;
		const plotH = h - topPad - bottomPad;
		
		// Draw horizontal grid lines and y-axis ticks
		const numTicks = 3;
		ctx.fillStyle = '#9aa4b8';
		ctx.font = '9px Segoe UI, Arial, sans-serif';
		ctx.textAlign = 'right';
		
		for(let i = 0; i <= numTicks; i++) {
			const val = max - (i / numTicks) * (max - min);
			const y = topPad + (i / numTicks) * plotH;
			
			// Horizontal grid line (dashed, like growth prediction)
			ctx.strokeStyle = '#e8ecf4';
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(leftPad, y);
			ctx.lineTo(w - rightPad, y);
			ctx.stroke();
			ctx.setLineDash([]);
			
			// Y-axis label (show min and max values)
			if(i === 0 || i === numTicks) {
				ctx.fillText(val.toFixed(id === 'mini2' ? 2 : 1), leftPad - 8, y + 3);
			}
		}
		
		// Draw vertical grid lines (dashed, like growth prediction)
		ctx.strokeStyle = '#f0f4f8';
		ctx.lineWidth = 1;
		const verticalTicks = 4;
		for(let i = 0; i <= verticalTicks; i++) {
			const x = leftPad + (i / verticalTicks) * plotW;
			ctx.setLineDash([3, 3]);
			ctx.beginPath();
			ctx.moveTo(x, topPad);
			ctx.lineTo(x, h - bottomPad);
			ctx.stroke();
			ctx.setLineDash([]);
		}
		
		// Create points for smooth curve
		const points = [];
		data.forEach((val, i) => {
			const x = leftPad + (i / (data.length - 1)) * plotW;
			const y = topPad + (1 - (val - min) / range) * plotH;
			points.push({x, y, val});
		});
		
		// Draw gradient fill
		ctx.beginPath();
		points.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = points[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y,
			points[points.length - 1].x, points[points.length - 1].y);
		ctx.lineTo(points[points.length - 1].x, h - bottomPad);
		ctx.lineTo(points[0].x, h - bottomPad);
		ctx.closePath();
		
		const gradient = ctx.createLinearGradient(leftPad, topPad, leftPad, h - bottomPad);
		gradient.addColorStop(0, 'rgba(43, 110, 246, 0.15)');
		gradient.addColorStop(1, 'rgba(43, 110, 246, 0)');
		ctx.fillStyle = gradient;
		ctx.fill();
		
		// Draw smooth line
		ctx.beginPath();
		points.forEach((point, i) => {
			if(i === 0) ctx.moveTo(point.x, point.y);
			else {
				const prevPoint = points[i - 1];
				const cpX = (prevPoint.x + point.x) / 2;
				const cpY = (prevPoint.y + point.y) / 2;
				ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
			}
		});
		ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y,
			points[points.length - 1].x, points[points.length - 1].y);
		
		ctx.strokeStyle = '#2b6ef6';
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.shadowColor = 'rgba(43, 110, 246, 0.25)';
		ctx.shadowBlur = 4;
		ctx.stroke();
		ctx.shadowBlur = 0;
		
		// Draw small indicator at the end
		const lastPoint = points[points.length - 1];
		ctx.beginPath();
		ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.strokeStyle = '#2b6ef6';
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	function updateSensorsAndActuators(){
		// sample values - replace with real sensor API later
		document.getElementById('val-ph').textContent = (6 + Math.random()*0.8).toFixed(2);
		document.getElementById('val-do').textContent = (7 + Math.random()*2).toFixed(1);
		document.getElementById('val-temp').textContent = (24 + Math.random()*3).toFixed(1);
		document.getElementById('val-hum').textContent = Math.floor(60 + Math.random()*20);
		document.getElementById('val-tds').textContent = (1 + Math.random()*1.5).toFixed(2);

		// actuators - use helper to set class + text
		setActuatorState('act-water', Math.random()>0.2 ? 'ON':'OFF');
		setActuatorState('act-air', Math.random()>0.5 ? 'ON':'OFF');
		setActuatorState('act-fan', Math.random()>0.4 ? 'ON':'OFF');
		setActuatorState('act-lights', Math.random()>0.3 ? 'ON':'OFF');
	}

	// helper: set actuator state text + class
	function setActuatorState(id, state){
		const el = document.getElementById(id);
		if(!el) return;
		el.textContent = state;
		el.classList.remove('on','off');
		if(state === 'ON') el.classList.add('on'); else el.classList.add('off');
	}

	// make actuator rows clickable to toggle
	document.querySelectorAll('.actuators .act').forEach(actEl=>{
		actEl.addEventListener('click', ()=>{
			const span = actEl.querySelector('.state');
			if(!span || !span.id) return;
			const current = span.textContent.trim();
			const next = current === 'ON' ? 'OFF' : 'ON';
			setActuatorState(span.id, next);
		});
	});

	// initial draw and periodic updates - wait a bit for layout to settle
	setTimeout(() => {
		drawGrowth(); drawMini('mini1'); drawMini('mini2'); drawMini('mini3'); updateSensorsAndActuators();
	}, 100);
	
	setInterval(()=>{ drawGrowth(); drawMini('mini1'); drawMini('mini2'); drawMini('mini3'); updateSensorsAndActuators(); }, 5000);
	
	// Handle window resize for responsive canvas
	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			drawGrowth();
			drawMini('mini1');
			drawMini('mini2');
			drawMini('mini3');
		}, 250);
	});

	// Calibration apply
	const applyCal = document.getElementById('applyCal');
	applyCal.addEventListener('click', ()=>{
		const sensor = document.getElementById('calSensor').value;
		const offset = parseFloat(document.getElementById('calOffset').value) || 0;
		alert(`Applied calibration offset ${offset} to ${sensor}`);
	});

	// Prediction functionality
	const predictionTab = document.getElementById('predictionTab');
	const predictionItem = predictionTab ? predictionTab.closest('.sidebar-dropdown') : null;

	if(predictionTab) {
		predictionTab.addEventListener('click', function (e) {
			e.preventDefault();
			// toggle open/close
			if(predictionItem) predictionItem.classList.toggle('open');
		});
	}

	// Handle metric selection from dropdown
	document.querySelectorAll('.dropdown-menu [data-metric]').forEach(item => {
		item.addEventListener('click', function (e) {
			e.preventDefault();
			const metric = this.getAttribute('data-metric');
			
			// Remove active from all metric links
			document.querySelectorAll('.dropdown-menu [data-metric]').forEach(link => {
				link.classList.remove('active');
			});
			// Add active to clicked link
			this.classList.add('active');
			
			// Switch to prediction tab
			activatePredictionTab(metric);
			
			// Close mobile sidebar
			if(window.innerWidth <= 900) {
				sidebar.classList.remove('open');
			}
		});
	});

});

// Metric info configuration (global)
const metricInfo = {
	leaves: { 
		label: 'Number of Leaves', 
		unit: 'leaves', 
		range: [5, 25], 
		description: 'Predicted leaf count based on growth model for all plants.'
	},
	weight: { 
		label: 'Weight', 
		unit: 'kg', 
		range: [0.5, 3.5], 
		description: 'Estimated plant weight over time for all plants.'
	},
	height: { 
		label: 'Height', 
		unit: 'cm', 
		range: [20, 80], 
		description: 'Predicted plant height progression for all plants.'
	},
	length: { 
		label: 'Length', 
		unit: 'cm', 
		range: [15, 60], 
		description: 'Expected stem/vine length for all plants.'
	},
	branches: { 
		label: 'Number of Branches', 
		unit: 'branches', 
		range: [2, 12], 
		description: 'Forecasted branch count for all plants.'
	}
};

// Handle metric selection from dropdown
document.querySelectorAll('.dropdown-menu [data-metric]').forEach(item => {
	item.addEventListener('click', function (e) {
		e.preventDefault();
		const metric = this.getAttribute('data-metric');
		
		// Remove active from all metric links
		document.querySelectorAll('.dropdown-menu [data-metric]').forEach(link => {
			link.classList.remove('active');
		});
		// Add active to clicked link
		this.classList.add('active');
		
		// Switch to prediction tab
		activatePredictionTab(metric);
		
		// Close mobile sidebar
		const sidebar = document.getElementById('sidebar');
		if(window.innerWidth <= 900 && sidebar) {
			sidebar.classList.remove('open');
		}
	});
});

function activatePredictionTab(metric) {
	// Hide all tab contents
	document.querySelectorAll('.tab-content').forEach(sec => {
		sec.classList.remove('active');
	});
	
	// Show prediction tab
	const predictSection = document.getElementById('predicting');
	if(predictSection) {
		predictSection.classList.add('active');
		
		// Update title and description
		const info = metricInfo[metric];
		if(info) {
			const title = document.getElementById('predictionTitle');
			const desc = document.getElementById('predictionDescription');
			if(title) title.textContent = `Prediction - ${info.label}`;
			if(desc) desc.textContent = info.description;
		}
		
		// Generate and draw plant graphs
		generatePlantGraphs(metric);
	}
	
	// Update active tab in sidebar
	document.querySelectorAll('[data-tab]').forEach(a => {
		a.classList.remove('active');
	});
	const predictionTab = document.getElementById('predictionTab');
	if(predictionTab) predictionTab.classList.add('active');
}

function generatePlantGraphs(metric) {
	const container = document.getElementById('plantsGraphsContainer');
	if(!container) return;
	
	// Clear existing graphs
	container.innerHTML = '';
	
	const info = metricInfo[metric];
	if(!info) return;
	
	// Create 6 plant graph cards
	for(let plantNum = 1; plantNum <= 6; plantNum++) {
		const card = document.createElement('div');
		card.className = 'plant-graph-card';
		
		const header = document.createElement('div');
		header.className = 'card-header';
		header.textContent = `Plant ${plantNum}`;
		
		const canvas = document.createElement('canvas');
		canvas.className = 'plant-graph-canvas';
		canvas.id = `plant-${plantNum}-graph`;
		canvas.width = 600;
		canvas.height = 250;
		
		card.appendChild(header);
		card.appendChild(canvas);
		container.appendChild(card);
		
		// Draw graph for this plant
		setTimeout(() => {
			drawPlantGraph(`plant-${plantNum}-graph`, metric, plantNum);
		}, 50);
	}
}

function drawPlantGraph(canvasId, metric, plantNum) {
	const canvas = document.getElementById(canvasId);
	if(!canvas || !canvas.getContext) return;
	
	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	
	const w = canvas.width, h = canvas.height;
	ctx.clearRect(0, 0, w, h);
	
	const info = metricInfo[metric];
	if(!info) return;
	
	const leftPad = 50, rightPad = 20, topPad = 20, bottomPad = 40;
	const [minVal, maxVal] = info.range;
	
	// Draw background
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, w, h);
	
	// Draw horizontal grid lines and y-axis ticks
	ctx.fillStyle = '#6c7380';
	ctx.font = '11px Segoe UI, Arial, sans-serif';
	ctx.textAlign = 'right';
	
	const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];
	yTicks.forEach(val => {
		const y = topPad + (1 - (val - minVal) / (maxVal - minVal)) * (h - topPad - bottomPad);
		
		// Grid line
		ctx.strokeStyle = '#e8ecf4';
		ctx.lineWidth = 1;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(leftPad, y);
		ctx.lineTo(w - rightPad, y);
		ctx.stroke();
		ctx.setLineDash([]);
		
		// Y-axis label
		ctx.fillText(val.toFixed(1), leftPad - 12, y + 4);
	});
	
	// Draw vertical grid lines
	ctx.strokeStyle = '#f0f4f8';
	ctx.lineWidth = 1;
	for(let i = 0; i <= 5; i++) {
		const x = leftPad + (i / 5) * (w - leftPad - rightPad);
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(x, topPad);
		ctx.lineTo(x, h - bottomPad);
		ctx.stroke();
		ctx.setLineDash([]);
	}
	
	// Generate prediction data (each plant has slightly different data)
	const baseValue = (minVal + maxVal) / 2;
	const variance = (maxVal - minVal) / 8;
	const plantVariance = (plantNum - 3.5) * (variance * 0.3); // Each plant differs slightly
	const data = window.randomWalk(30, baseValue + plantVariance, variance)
		.map(v => Math.max(minVal, Math.min(maxVal, v)));
	
	// Draw smooth line with gradient fill
	const plotW = w - leftPad - rightPad;
	const plotH = h - topPad - bottomPad;
	
	// Create gradient fill
	const gradient = ctx.createLinearGradient(leftPad, topPad, leftPad, h - bottomPad);
	gradient.addColorStop(0, 'rgba(43, 110, 246, 0.2)');
	gradient.addColorStop(1, 'rgba(43, 110, 246, 0)');
	
	// Draw fill area
	ctx.beginPath();
	const points = [];
	data.forEach((val, i) => {
		const x = leftPad + (i / (data.length - 1)) * plotW;
		const y = topPad + (1 - (val - minVal) / (maxVal - minVal)) * plotH;
		points.push({x, y});
		if(i === 0) ctx.moveTo(x, y);
		else {
			// Smooth curve
			const prevPoint = points[i - 1];
			const cpX = (prevPoint.x + x) / 2;
			const cpY = (prevPoint.y + y) / 2;
			ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
		}
	});
	
	// Close fill area
	ctx.lineTo(points[points.length - 1].x, h - bottomPad);
	ctx.lineTo(points[0].x, h - bottomPad);
	ctx.closePath();
	ctx.fillStyle = gradient;
	ctx.fill();
	
	// Draw line
	ctx.beginPath();
	points.forEach((point, i) => {
		if(i === 0) ctx.moveTo(point.x, point.y);
		else {
			const prevPoint = points[i - 1];
			const cpX = (prevPoint.x + point.x) / 2;
			const cpY = (prevPoint.y + point.y) / 2;
			ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
		}
	});
	ctx.quadraticCurveTo(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].x, points[points.length - 1].y);
	
	ctx.strokeStyle = '#2b6ef6';
	ctx.lineWidth = 3;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.shadowColor = 'rgba(43, 110, 246, 0.3)';
	ctx.shadowBlur = 6;
	ctx.stroke();
	ctx.shadowBlur = 0;
	
	// Draw data points at key positions
	points.forEach((point, i) => {
		if(i % 5 === 0 || i === points.length - 1) {
			ctx.beginPath();
			ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
			ctx.fillStyle = '#ffffff';
			ctx.fill();
			ctx.strokeStyle = '#2b6ef6';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	});
	
	// X-axis labels
	ctx.fillStyle = '#9aa4b8';
	ctx.font = '10px Segoe UI, Arial, sans-serif';
	ctx.textAlign = 'center';
	const days = ['Day 1', 'Day 10', 'Day 20', 'Day 30'];
	days.forEach((day, i) => {
		const x = leftPad + (i / (days.length - 1)) * plotW;
		ctx.fillText(day, x, h - bottomPad + 20);
	});
	
	// Y-axis label
	ctx.save();
	ctx.translate(15, h / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.fillStyle = '#6c7380';
	ctx.font = '11px Segoe UI, Arial, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(`${info.label} (${info.unit})`, 0, 0);
	ctx.restore();
}


