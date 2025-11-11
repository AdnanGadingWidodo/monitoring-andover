const x_data = () => {
	return {
		ipAddress: "http://localhost:5001",
		port: "COM7",
		baudrate: "9600",
		realtimeData: true,
		currentDate: moment().format("YYYY-MM-DD"),
		currentTime: moment().format("HH:mm:ss"),

		surfaceCamera: {
			streamUrl: "",
			waypointsText: "",
			waypoints: [],
			image: "",
			refreshImage: 0,
			refreshStream: 0,
		},

		underwaterCamera: {
			streamUrl: "",
			waypointsText: "",
			waypoints: [],
			image: "",
			refreshImage: 0,
			refreshStream: 0,
		},

		vehicleData: {
			app_connect: true,
			alt: 0,
			battery: 0,
			date: "",
			is_armable: false,
			last_heartbeat: "",
			lat: 0,
			long: 0,
			mode: "",
			pitch: 0,
			roll: 0,
			surface_camera_connect: true,
			system_status: "",
			time: "",
			underwater_camera_connect: false,
			yaw: 0,
		},

		async init() {
			setInterval(async () => {
				if (this.realtimeData) {
					const response = await axios.get(`${this.ipAddress}/context`);
					this.vehicleData = response.data.data;
				}
			}, 2000);
			setInterval(() => {
				this.currentDate = moment().format("YYYY-MM-DD");
				this.currentTime = moment().format("HH:mm:ss");
			}, 1000);
		},

		async connectGcs() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					app_connect: true,
					port: this.port,
					baudrate: this.baudrate
				});
				toastr.success("GCS connected successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to connect GCS", "Error");
			}
		},

		async disconnectGcs() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					app_connect: false,
				});
				toastr.success("GCS disconnected successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to disconnect GCS", "Error");
			}
		},

		async saveSurfaceWaypoints() {
			if (this.surfaceCamera.waypointsText === "") {
				toastr.error("Waypoints for surface camera cannot be empty", "Error");
				return;
			}
			try {
				this.surfaceCamera.waypoints =
					this.surfaceCamera.waypointsText.split(" ");
				const response = await axios.post(`${this.ipAddress}/context`, {
					surface_camera_waypoints: this.surfaceCamera.waypoints,
				});
				toastr.success(
					"Waypoints for surface camera saved successfully!",
					"Success"
				);
			} catch (error) {
				toastr.error("Failed to save waypoints for surface camera", "Error");
			}
		},

		async startSurfaceCamera() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					surface_camera_connect: true,
				});
				this.surfaceCamera.refreshStream += 1;
				this.surfaceCamera.streamUrl = `${this.ipAddress}/camera/surface-stream?refresh=${this.surfaceCamera.refreshStream}`;
				toastr.success("Surface camera started successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to start surface camera", "Error");
			}
		},

		async stopSurfaceCamera() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					surface_camera_connect: false,
				});
				this.surfaceCamera.streamUrl = "";
				toastr.success("Surface camera stopped successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to stop surface camera", "Error");
			}
		},

		async captureSurfaceImage() {
			try {
				const response = await axios.get(
					`${this.ipAddress}/camera/surface-capture`
				);
				this.surfaceCamera.refreshImage += 1;
				this.surfaceCamera.image = `${this.ipAddress}/camera/surface-latest?refresh=${this.surfaceCamera.refreshImage}`;
				toastr.success(
					"Image for surface camera captured successfully!",
					"Success"
				);
			} catch (error) {
				toastr.error("Failed to capture surface image", "Error");
			}
		},

		async startUnderwaterCamera() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					underwater_camera_connect: true,
				});
				this.underwaterCamera.refreshStream += 1;
				this.underwaterCamera.streamUrl = `${this.ipAddress}/camera/underwater-stream?refresh=${this.underwaterCamera.refreshStream}`;
				toastr.success("Underwater camera started successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to start underwater camera", "Error");
			}
		},

		async stopUnderwaterCamera() {
			try {
				const response = await axios.post(`${this.ipAddress}/context`, {
					underwater_camera_connect: false,
				});
				this.underwaterCamera.streamUrl = "";
				toastr.success("Underwater camera stopped successfully!", "Success");
			} catch (error) {
				toastr.error("Failed to stop underwater camera", "Error");
			}
		},

		async saveUnderwaterWaypoints() {
			if (this.underwaterCamera.waypointsText === "") {
				toastr.error(
					"Waypoints for underwater camera cannot be empty",
					"Error"
				);
				return;
			}
			try {
				this.underwaterCamera.waypoints =
					this.underwaterCamera.waypointsText.split(" ");
				const response = await axios.post(`${this.ipAddress}/context`, {
					underwater_camera_waypoints: this.underwaterCamera.waypoints,
				});
				toastr.success(
					"Waypoints for underwater camera saved successfully!",
					"Success"
				);
			} catch (error) {
				toastr.error("Failed to save waypoints for underwater camera", "Error");
			}
		},

		async captureUnderwaterImage() {
			try {
				const response = await axios.get(
					`${this.ipAddress}/camera/underwater-capture`
				);
				this.underwaterCamera.refreshImage += 1;
				this.underwaterCamera.image = `${this.ipAddress}/camera/underwater-latest?refresh=${this.underwaterCamera.refreshImage}`;
				toastr.success(
					"Image for underwater camera captured successfully!",
					"Success"
				);
			} catch (error) {
				toastr.error("Failed to capture underwater image", "Error");
			}
		},
	};
};
