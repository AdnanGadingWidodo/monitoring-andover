function x_data() {
	return {
		currentScreen: 'menu',
		currentMode: 'monitoring',
		
		loginUsername: '',
		loginPassword: '',
		correctUsername: 'krakatau',
		correctPassword: 'andover',
		
		vehicleData: {
			app_connect: false,
			date: 'N/A',
			time: 'N/A',
			lat: 'N/A',
			long: 'N/A',
			alt: 'N/A',
			depth: 'N/A',
			yaw: 'N/A',
			roll: 'N/A',
			battery: 'N/A'
		},
		surfaceCamera: {
			streamUrl: 'https://via.placeholder.com/400x250/667eea/ffffff?text=Surface+Cam+Offline',
			image: 'https://via.placeholder.com/300x200/667eea/ffffff?text=Surface+Image',
			waypointsText: '',
			refreshStream: 0
		},
		underwaterCamera: {
			streamUrl: 'https://via.placeholder.com/400x250/764ba2/ffffff?text=Underwater+Cam+Offline',
			image: 'https://via.placeholder.com/300x200/764ba2/ffffff?text=Underwater+Image',
			waypointsText: ''
		},
		ipAddress: '192.168.1.1',
		port: '8080',
		baudrate: '115200',
		realtimeData: true,
		isConnecting: false,
		currentTime: new Date().toLocaleTimeString(),
		currentDate: new Date().toLocaleDateString(),
		
		init() {
			setInterval(() => {
				this.currentTime = new Date().toLocaleTimeString();
				this.currentDate = new Date().toLocaleDateString();
			}, 1000);

			toastr.options = {
				"closeButton": true,
				"progressBar": true,
				"positionClass": "toast-top-right",
				"timeOut": "5000",
			}
		},
		
		selectMonitoring() {
			this.currentMode = 'monitoring';
			this.currentScreen = 'dashboard';
			toastr.info('Monitoring mode activated');
		},
		
		showLogin() {
			this.currentScreen = 'login';
			this.loginUsername = '';
			this.loginPassword = '';
		},
		
		login() {
			if (this.loginUsername === this.correctUsername && this.loginPassword === this.correctPassword) {
				this.currentMode = 'control';
				this.currentScreen = 'dashboard';
				toastr.success('Login successful! Control mode activated');
			} else {
				toastr.error('Invalid username or password!');
			}
		},
		
		logout() {
			this.currentScreen = 'menu';
			this.currentMode = 'monitoring';
			this.loginUsername = '';
			this.loginPassword = '';
			toastr.info('Logged out successfully');
		},
		
		backToMenu() {
			this.currentScreen = 'menu';
		},
		
		saveSurfaceWaypoints() {
			console.log('Saving surface waypoints:', this.surfaceCamera.waypointsText);
			toastr.info('Surface waypoints saved to console.');
		},
		
		saveUnderwaterWaypoints() {
			console.log('Saving underwater waypoints:', this.underwaterCamera.waypointsText);
			toastr.info('Underwater waypoints saved to console.');
		},
		
		startSurfaceCamera() {
			console.log('Starting surface camera');
			this.surfaceCamera.refreshStream++;
			toastr.success('Surface camera started.');
		},
		
		stopSurfaceCamera() {
			console.log('Stopping surface camera');
			toastr.warning('Surface camera stopped.');
		},
		
		captureSurfaceImage() {
			console.log('Capturing surface image');
			toastr.info('Surface image captured.');
		},
		
		startUnderwaterCamera() {
			console.log('Starting underwater camera');
			toastr.success('Underwater camera started.');
		},
		
		stopUnderwaterCamera() {
			console.log('Stopping underwater camera');
			toastr.warning('Underwater camera stopped.');
		},
		
		captureUnderwaterImage() {
			console.log('Capturing underwater image');
			toastr.info('Underwater image captured.');
		},
		
		async connectGcs() {
			if (this.isConnecting) return;
			
			this.isConnecting = true;
			console.log(`Attempting to connect to GCS at http://${this.ipAddress}:${this.port}`);
			toastr.info('Connecting to GCS...');

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			try {
				const response = await fetch(`http://${this.ipAddress}:${this.port}/status`, {
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (response.ok) {
					console.log('Connection successful!');
					this.vehicleData.app_connect = true;
					toastr.success('Successfully connected to GCS!');
				} else {
					throw new Error(`Server responded with status: ${response.status}`);
				}
			} catch (error) {
				console.error('Connection failed:', error.name === 'AbortError' ? 'Connection Timed Out' : error.message);
				this.vehicleData.app_connect = false;
				toastr.error('GCS not found or connection refused.');
			} finally {
				this.isConnecting = false;
			}
		},
		
		disconnectGcs() {
			console.log('Disconnecting from GCS');
			this.vehicleData.app_connect = false;
			toastr.warning('Disconnected from GCS.');
		}
	}
}