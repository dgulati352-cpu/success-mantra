// Abstract MediaTransport interface (SFU-Ready)

export class MediaTransport {
  constructor(socket, config) {
    this.socket = socket;
    this.config = config;
  }

  async publishLocalStream(stream) {
    throw new Error('publishLocalStream not implemented');
  }

  async publishScreenStream(stream) {
    throw new Error('publishScreenStream not implemented');
  }

  async removeScreenStream() {
    throw new Error('removeScreenStream not implemented');
  }

  async subscribeToPeer(peerSocketId, isTeacher) {
    throw new Error('subscribeToPeer not implemented');
  }

  disconnect() {
    throw new Error('disconnect not implemented');
  }
}
