export class ConnectionQualityManager {
  constructor(peerConnection, onQualityChange) {
    this.pc = peerConnection;
    this.onQualityChange = onQualityChange;
    this.timer = null;
  }

  startMonitoring(intervalMs = 3000) {
    if (!this.pc) return;

    this.timer = setInterval(async () => {
      try {
        if (!this.pc || this.pc.connectionState === 'closed') {
          this.stopMonitoring();
          return;
        }

        const stats = await this.pc.getStats();
        let rtt = null;
        let packetsLost = 0;

        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime;
          }
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
          }
        });

        let quality = 'excellent';
        if (rtt && rtt > 0.3) quality = 'poor';
        else if (rtt && rtt > 0.15) quality = 'good';

        if (this.onQualityChange) {
          this.onQualityChange({ quality, rtt, packetsLost });
        }
      } catch (err) {
        // Ignore stats check error
      }
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
