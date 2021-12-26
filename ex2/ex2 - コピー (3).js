
(function (window, document, undefined) {

	const LEAFLET_MARKER = 'marker';
	const MARKER_COLOR_ORIGINAL = 'blue';	// blue/green/orange/yellow/red/purple/violet
	const MARKER_COLOR_MODIFIED = 'green';	// blue/green/orange/yellow/red/purple/violet
	const KEY_STORAGE = 'mymap-data';
	const CSVFILE_ENCODING = 'Shift_JIS';
	const MODIFIED_MARK = '*';

	var tiles_gsi = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',{
		attribution: ' <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
		maxZoom: 18
	});

	var tiles_osm = L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, '
	});

	// 地図
	var map = L.map('mymap', {
	    center: [35.06841434635014, 136.02219521999362], 
		zoom:17,
		layers: [tiles_gsi]
	});

	// 背景
	var baseLayers = {
		'gsi': tiles_gsi,
		'osm': tiles_osm
	};

	// Markerのグループを集めたもの
	var overlays = {};  // 入れ物を用意

	// データ取得 → Markerのグループ作成
	loadData();

	// 地図に背景、Markerを設定
	var layerControl = L.control.layers(baseLayers, overlays).addTo(map);


	// ローカルストレージからデータを取得する
	function loadData() {
		let data = [];
		try {

			// ローカルストレージからデータを取得する
			let dataStr = localStorage.getItem(KEY_STORAGE);
			if (dataStr === undefined || dataStr === null) {
				// なかった
				//data = data_1;
			} else {
				// 取得したデータをデコードする
				data = JSON.parse(dataStr);
			}
		} catch(e) {
			console.warn('failed to load data from localStorage: ' + e);
		}

		// データを地図上に設定する
		importIntoMap(data);
	}


	// 地図上のMarkerを削除する
	function clearMap() {
		for(area in overlays) {
			let group = overlays[area];
			group.clearLayers();
			console.warn('cleared: group "' + area + '"');
		}
	}


	// データを地図上に設定する
	function importIntoMap(data) {
		data.forEach(item => {
			let layer = null;
			let extraOpt = {};
			if (item.color) {
				extraOpt.color = item.color;
			}
			switch(item.type) {
				case 'marker':  // Marker

					// Markerを入れるグループを決定
					let group;
					if (item.area in overlays){
						// 登録済みのエリアの場合
						group = overlays[item.area];
					} else {
						// 未登録のエリアの場合
						// グループを新たに作って地図に登録する
						group = L.layerGroup();
						overlays[item.area] = group;
						group.addTo(map);
					}

					// Markerを作ってグループに登録する
					let markerColor = item.modified ? MARKER_COLOR_MODIFIED : MARKER_COLOR_ORIGINAL;
					//let marker = L.marker(item.latLng,{draggable:'true', icon: L.spriteIcon(markerColor), title:item.name}).addTo(group);
					let marker = L.marker(item.latLng,{draggable:'true', icon: L.spriteIcon(markerColor)}).addTo(group);
					marker.bindTooltip(item.modified ? addModifiedMark(item.name) : item.name);

					// Marker移動後の処理
					marker.on('dragend', function (event) {
						let marker = event.target;
						let position = marker.getLatLng();
						marker.setLatLng(new L.LatLng(position.lat, position.lng));
						//map.panTo(new L.LatLng(position.lat, position.lng));
						marker.setIcon(L.spriteIcon(MARKER_COLOR_MODIFIED));

						//名前にMODIFIED_MARKを付ける
						let name = marker.getTooltip().getContent();
						marker.bindTooltip(addModifiedMark(name));
				
						// データを保存する
						saveData();
					});

					break;

				default:
					console.warn('unknown layer type "' + item.type + '" when loading draw tools layer');
					break;
			}
		});
	}


	// 名前にMODIFIED_MARKが付いているかどうか判定
	function hasModifiedMark(tooltipStr){
		if (tooltipStr == undefined) {
			return false;
		}
		if (tooltipStr.length < 1) {
			return false;
		}
		let s = tooltipStr.charAt(tooltipStr.length - 1);
		return (s == MODIFIED_MARK);
	}

	// 名前にMODIFIED_MARKを付ける
	function addModifiedMark(name){
		if (hasModifiedMark(name)) {
			// 既に付いていたらそのまま
			return name;
		}

		if (name == undefined) {
			return MODIFIED_MARK;
		} else {
			return name + MODIFIED_MARK;
		}
	}

	// 名前からMODIFIED_MARKを消す
	function removeModifiedMark(name){
		if (!hasModifiedMark(name)) {
			// 付いていなかったらそのまま
			return name;
		}

		return name.substring(0, name.length - 1);
	}


	// ローカルストレージにデータを保存する
	function saveData() {
		let data = exportFromMap();
		try {
			localStorage.setItem(KEY_STORAGE, JSON.stringify(data));
			console.log('saved to localStorage');
		} catch(e) {
			console.warn('failed to save data to localStorage: ' + e);
		}
	}

	function exportFromMap() {
		let data = [];
		for(area in overlays) {
			group = overlays[area];
			group.eachLayer(layer => {
				var item = {};
				if(layer instanceof L.Marker) {
					// Markerの場合
					item.type = LEAFLET_MARKER;
					item.area = area;
					item.number = '!!!';
					item.name = removeModifiedMark(layer.getTooltip().getContent());
					item.latLng = layer.getLatLng();
					//item.color = layer.options.icon.options.color;
					item.modified = hasModifiedMark(layer.getTooltip().getContent());
					console.log("area:" + item.area + "  number=" + item.number + "  name=" + item.name + "  latLng=" + item.latLng + "  modified=" + item.modified);
				}
				data.push(item);
			});
		}
		return data;
	}


	// CSVファイル読み込みボタンのイベントハンドラーを設定する
	document.getElementById("csvfile").onchange = readFile;
	function readFile(e) {
		let file = e.target.files[0];
		
		let reader = new FileReader();
		
		reader.readAsText(file, CSVFILE_ENCODING);
		
		reader.onload = function() {
			console.log(reader.result);
			let csvdata = reader.result;

			let data = []; //
			const dataString = csvdata.replace('\r\n','\n').split('\n'); //改行で分割
			dataString.forEach(line => {
				let values = line.split(',');
				if(values.length >= 5) {
					var item = {};
					item.type = LEAFLET_MARKER;
					item.area = values[1];
					item.number = values[0];
					item.name = values[2];
					item.latLng = [values[3], values[4]];
					item.modified = false;
					data.push(item);
				}
			});
			
			// 地図上のMarkerを削除する
			clearMap();

			// データを地図上に設定する
			importIntoMap(data);
		};
		
		reader.onerror = function() {
			console.log(reader.error);
		};
		
	}

}(window, document));

