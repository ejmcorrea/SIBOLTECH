document.addEventListener('DOMContentLoaded', ()=>{
	const burger = document.getElementById('burger');
	const sidebar = document.getElementById('sidebar');
	const tabs = document.querySelectorAll('[data-tab]');
	const contents = document.querySelectorAll('.tab-content');

	// Toggle sidebar (mobile)
	burger.addEventListener('click', ()=>{
		sidebar.classList.toggle('open');
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
	systemSelect.addEventListener('change', updateSystemUI);
	updateSystemUI();

	// Simple Predicting canvas (with 6 plants)
	const predictCanvas = document.getElementById('predictChart');
	const predictionMetricSelect = document.getElementById('predictionMetric');
	const predictInfo = document.getElementById('predictInfo');
	const predictionTitle = document.getElementById('predictionTitle');

	const metricInfo = {
		leaves: { label: 'Number of Leaves', unit: 'leaves', range: [5, 25], info: 'Predicted leaf count based on growth model.' },
		weight: { label: 'Weight', unit: 'kg', range: [0.5, 3.5], info: 'Estimated plant weight over time.' },
		height: { label: 'Height', unit: 'cm', range: [20, 80], info: 'Predicted plant height progression.' },
		length: { label: 'Length', unit: 'cm', range: [15, 60], info: 'Expected stem/vine length.' },
		branches: { label: 'Number of Branches', unit: 'branches', range: [2, 12], info: 'Forecasted branch count.' }
	};

	function drawPredictionChart(){
		if(!predictCanvas || !predictCanvas.getContext || !predictionMetricSelect) return;
		const metric = predictionMetricSelect.value;
		const info = metricInfo[metric];
		if(!info) return;

		const ctx = predictCanvas.getContext('2d');
		const w = predictCanvas.width, h = predictCanvas.height;
		ctx.clearRect(0,0,w,h);
		ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);

		const leftPad = 50, rightPad = 20, topPad = 20, bottomPad = 40;
		const [minVal, maxVal] = info.range;

		// draw y-axis labels and grid
		ctx.fillStyle = '#9aa4b8'; ctx.font = '12px Arial'; ctx.textAlign = 'right';
		const yTicks = [minVal, (minVal+maxVal)/2, maxVal];
		yTicks.forEach(val => {
			const y = topPad + (1 - (val - minVal)/(maxVal - minVal)) * (h - topPad - bottomPad);
			ctx.fillText(String(val.toFixed(1)), leftPad - 10, y + 4);
			ctx.strokeStyle = '#d4dce8'; ctx.lineWidth = 1;
			ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(w - rightPad, y); ctx.stroke();
		});

		// vertical grid
		ctx.strokeStyle = '#e4ecff'; ctx.lineWidth = 0.8;
		for(let i = 0; i <= 5; i++){
			const x = leftPad + (i/5) * (w - leftPad - rightPad);
			ctx.beginPath(); ctx.moveTo(x, topPad); ctx.lineTo(x, h - bottomPad); ctx.stroke();
		}

		// draw 6 plant lines
		const plotW = w - leftPad - rightPad, plotH = h - topPad - bottomPad;
		const colors = ['#2b6ef6', '#f97316', '#22c55e', '#a855f7', '#0ea5e9', '#ef4444'];
		for(let p = 0; p < 6; p++){
			const data = randomWalk(30, (minVal+maxVal)/2, (maxVal-minVal)/8)
				.map(v => Math.max(minVal, Math.min(maxVal, v)));

			ctx.strokeStyle = colors[p % colors.length];
			ctx.lineWidth = 2;
			ctx.beginPath();
			data.forEach((v, i) => {
				const x = leftPad + (i/(data.length-1))*plotW;
				const y = topPad + (1 - (v - minVal)/(maxVal - minVal)) * plotH;
				if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
			});
			ctx.stroke();
		}

		// x-axis label
		ctx.fillStyle = '#6c7380'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
		ctx.fillText('Days', w/2, h - 8);

		// y-axis label
		ctx.save();
		ctx.translate(15, h/2);
		ctx.rotate(-Math.PI/2);
		ctx.fillText(info.label + ` (${info.unit})`, 0, 0);
		ctx.restore();

		// update title and info text
		if(predictionTitle) predictionTitle.textContent = `Prediction - ${info.label}`;
		if(predictInfo) predictInfo.textContent = info.info;
	}


	// initial prediction chart with default metric
	if(predictionMetricSelect){
		if(!predictionMetricSelect.value) predictionMetricSelect.value = 'leaves';
		drawPredictionChart();
	}

	// Home dashboard: draw growth chart and mini graphs, populate sensor values
	const growthCanvas = document.getElementById('growthChart');
	function randomWalk(len, base=30, amp=10){
		const a=[]; let v=base; for(let i=0;i<len;i++){ v += (Math.random()-0.45)*amp; a.push(v); } return a;
	}

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
		const ctx = growthCanvas.getContext('2d'); const w=growthCanvas.width, h=growthCanvas.height;
		ctx.clearRect(0,0,w,h); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
		const leftPad = 44, rightPad = 10, topPad = 10, bottomPad = 30;

		// draw horizontal grid lines and y-axis ticks for fixed scale
		const ticks = [0,20,40,60,80,100];
		ctx.fillStyle = '#9aa4b8'; ctx.font = '12px Arial'; ctx.textAlign='right';
		ticks.forEach(val=>{
			const y = topPad + (1 - (val/100)) * (h - topPad - bottomPad);
			ctx.fillText(String(val), leftPad - 8, y + 4);
			// horizontal grid line - more visible
			ctx.strokeStyle = '#d4dce8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(w - rightPad, y); ctx.stroke();
		});

		// draw vertical grid lines
		const verticalTicks = 5;
		ctx.strokeStyle = '#e4ecff'; ctx.lineWidth = 0.8;
		for(let i = 0; i <= verticalTicks; i++){
			const x = leftPad + (i/verticalTicks) * (w - leftPad - rightPad);
			ctx.beginPath(); ctx.moveTo(x, topPad); ctx.lineTo(x, h - bottomPad); ctx.stroke();
		}

		// sample data (map into 0-100 range for visualization)
		const predicted = randomWalk(30,60,6).map(v => Math.max(0, Math.min(100, v)));
		const actual = predicted.map((v,i)=>Math.max(0, Math.min(100, v - (Math.random()*6))));

		// draw lines
		drawLine(ctx, actual, '#9aa4b8', leftPad, rightPad, topPad, bottomPad, 2);
		drawLine(ctx, predicted, '#2b6ef6', leftPad, rightPad, topPad, bottomPad, 2.5);
	}

	function drawMini(id){
		const c = document.getElementById(id); if(!c || !c.getContext) return;
		const ctx = c.getContext('2d'); const w = c.width, h = c.height;
		ctx.clearRect(0,0,w,h); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
		const leftPad = 34, rightPad = 6, topPad = 6, bottomPad = 6;
		const data = randomWalk(20, Math.random()*6+3, 2);
		const min = Math.min(...data), max = Math.max(...data);

		// draw y-axis labels (3 ticks) and horizontal grid lines
		ctx.fillStyle = '#9aa4b8'; ctx.font='11px Arial'; ctx.textAlign='right';
		const ticks = [max, (max+min)/2, min];
	ticks.forEach((val,idx)=>{
		const y = topPad + (idx/(ticks.length-1)) * (h - topPad - bottomPad);
		ctx.fillText(Number(val).toFixed(1), leftPad - 8, y + 4);
		// horizontal grid - more visible
		ctx.strokeStyle = '#d4dce8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(w - rightPad, y); ctx.stroke();
	});

		// draw vertical grid lines
		const verticalTicks = 4;
		ctx.strokeStyle = '#e4ecff'; ctx.lineWidth = 0.6;
		for(let i = 0; i <= verticalTicks; i++){
			const x = leftPad + (i/verticalTicks) * (w - leftPad - rightPad);
			ctx.beginPath(); ctx.moveTo(x, topPad); ctx.lineTo(x, h - bottomPad); ctx.stroke();
		}

		// draw line in plot area
		ctx.strokeStyle = '#2b6ef6'; ctx.lineWidth=2; ctx.beginPath();
		data.forEach((v,i)=>{
			const plotW = w - leftPad - rightPad; const plotH = h - topPad - bottomPad;
			const x = leftPad + (i/(data.length-1))*plotW;
			const y = topPad + (1 - (v - min) / (max - min || 1)) * plotH;
			if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
		});
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

	// initial draw and periodic updates
	drawGrowth(); drawMini('mini1'); drawMini('mini2'); drawMini('mini3'); updateSensorsAndActuators();
	setInterval(()=>{ drawGrowth(); drawMini('mini1'); drawMini('mini2'); drawMini('mini3'); updateSensorsAndActuators(); }, 5000);

	// Prediction dropdown behaviour in sidebar
	const predictionTab = document.getElementById('predictionTab');
	const predictionItem = predictionTab ? predictionTab.closest('.sidebar-dropdown') : null;
	if(predictionTab && predictionItem){
		// open/close dropdown when clicking main "Prediction" item
		predictionTab.addEventListener('click', function (e) {
			e.preventDefault();
			predictionItem.classList.toggle('open');
		});

		// handle click on each metric in dropdown
		const metricLinks = predictionItem.querySelectorAll('.dropdown-menu a[data-metric]');
		metricLinks.forEach(link => {
			link.addEventListener('click', function(e){
				e.preventDefault();
				const metric = link.getAttribute('data-metric');
				if(!metric || !metricInfo[metric]) return;

				// switch tab to predicting
				tabs.forEach(x=>x.classList.remove('active'));
				contents.forEach(c=>c.classList.remove('active'));
				predictionTab.classList.add('active');
				const target = document.getElementById('predicting');
				if(target) target.classList.add('active');

				// set metric and redraw chart
				if(predictionMetricSelect){
					predictionMetricSelect.value = metric;
				}
				drawPredictionChart();

				// close dropdown and sidebar (on mobile)
				predictionItem.classList.remove('open');
				if(window.innerWidth <= 900) sidebar.classList.remove('open');
			});
		});
	}

	// Calibration apply
	const applyCal = document.getElementById('applyCal');
	applyCal.addEventListener('click', ()=>{
		const sensor = document.getElementById('calSensor').value;
		const offset = parseFloat(document.getElementById('calOffset').value) || 0;
		alert(`Applied calibration offset ${offset} to ${sensor}`);
	});

});

const predictionTab = document.getElementById('predictionTab');
const predictionItem = predictionTab.closest('.sidebar-dropdown');

predictionTab.addEventListener('click', function (e) {
	// kung gusto mong mag-open lang dropdown at huwag mag-change tab:
	e.preventDefault();

	// toggle open/close
	predictionItem.classList.toggle('open');
});
