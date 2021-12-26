
(function (window, document, undefined) {

	var KEY_STORAGE = 'mymap-data';
	var LEAFLET_MARKER = 'marker';

	var tiles_gsi = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',{
		attribution: ' <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
		maxZoom: 18
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
	};

	// Markerのグループを集めたもの
	var overlays = {};  // 入れ物を用意

	// データ取得 → Markerのグループ作成
	loadData();

	// 地図に背景、Markerを設定
	var layerControl = L.control.layers(baseLayers, overlays).addTo(map);

	// ローカルストレージからデータを取得する
	function loadData() {

		// デフォルトのデータ  test用
		var AREA_1 = 'ああああ';
		var AREA_2 = 'いいいい';
		var data_1 = [
			{type:LEAFLET_MARKER, area:AREA_1, latLng:[35.06841434635014, 136.02219521999362], color:'green'},
			{type:LEAFLET_MARKER, area:AREA_1, latLng:[35.06758232400261, 136.02373212575915], color:'green'},
			{type:LEAFLET_MARKER, area:AREA_2, latLng:[35.067033491954106, 136.02481573820114], color:'green'},
			{type:LEAFLET_MARKER, area:AREA_2, latLng:[35.06376676725211, 136.0306254029274], color:'green'}
		];

		var data;
		try {

			// ローカルストレージからデータを取得する
			var dataStr = localStorage.getItem(KEY_STORAGE);
			if (dataStr === undefined || dataStr === null) {
				// なかった
				data = data_1;
			} else {
				// 取得したデータをデコードする
				data = JSON.parse(dataStr);
			}
		} catch(e) {
			console.warn('failed to load data from localStorage: '+e);
		}

		// データを地図上に設定する
		importIntoMap(data);
	}

	// データを地図上に設定する
	function importIntoMap(data) {
		data.forEach(item => {
			var layer = null;
			var extraOpt = {};
			if (item.color) {
				extraOpt.color = item.color;
			}
			switch(item.type) {
				case 'marker':  // Marker

					// Markerを入れるグループを決定
					var group;
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
					var marker = L.marker(item.latLng,{draggable:'true'}).addTo(group);
					marker.on('dragend', marker_onDragend);
					break;
				default:
					console.warn('unknown layer type "' + item.type + '" when loading draw tools layer');
					break;
			}
		});
	}


	// ローカルストレージにデータを保存する
	function saveData() {
		var data = exportFromMap();
		try {
			localStorage.setItem(KEY_STORAGE, JSON.stringify(data));
			console.log('saved to localStorage');
		} catch(e) {
			console.warn('failed to save data to localStorage: ' + e);
		}
	}

	function exportFromMap() {
		var data = [];
		for(area in overlays) {
			group = overlays[area];
			group.eachLayer(layer => {
				var item = {};
				if(layer instanceof L.Marker) {
					// Markerの場合
					item.type = LEAFLET_MARKER;
					item.area = area;
					item.latLng = layer.getLatLng();
					item.color = layer.options.icon.options.color;
					console.log("area:" + item.area + "  latLng=" + item.latLng + "  color=" + item.color);
				}
				data.push(item);
			});
		}
		return data;
	}

	function marker_onDragend(event) {
		var marker = event.target;
		var position = marker.getLatLng();
		marker.setLatLng(new L.LatLng(position.lat, position.lng),{draggable:'true'});
		//map.panTo(new L.LatLng(position.lat, position.lng));

		// データを保存する
		saveData();
	}




	var popup = L.popup()
		.setLatLng([35.16842434645014, 136.02219521999062])
		.setContent('I am a standalone popup.')
	


	function onMapClick(e) {
		popup
			.setLatLng(e.latlng)
			.setContent('You clicked the map at ' + e.latlng.toString())
			.openOn(map);
	}

	map.on('click', onMapClick);


}(window, document));
