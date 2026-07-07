import { collection, doc, setDoc, onSnapshot, addDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { errorEmitter } from '@/firebase';

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private unsubscribeCall: (() => void) | null = null;
  private unsubscribeAnswer: (() => void) | null = null;

  async startScreenShare(firestore: Firestore, userId: string, orgId: string, stream: MediaStream) {
    try {
      this.localStream = stream;
      
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun1.l.google.com:19302' },
        ]
      };
      
      this.peerConnection = new RTCPeerConnection(configuration);

      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      const callDoc = doc(firestore, 'webrtc-sessions', `${orgId}_${userId}`);
      const offerCandidates = collection(callDoc, 'offerCandidates');
      const answerCandidates = collection(callDoc, 'answerCandidates');

      this.peerConnection.onicecandidate = event => {
        if (event.candidate) {
          addDoc(offerCandidates, event.candidate.toJSON());
        }
      };

      const offerDescription = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await setDoc(callDoc, { offer, userId, orgId, status: 'sharing', timestamp: new Date().toISOString() });

      this.unsubscribeCall = onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (!this.peerConnection?.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          this.peerConnection.setRemoteDescription(answerDescription);
        }
      });

      this.unsubscribeAnswer = onSnapshot(answerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            this.peerConnection?.addIceCandidate(candidate);
          }
        });
      });

      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

    } catch (error: any) {
      errorEmitter.emit('webrtc-error', error);
      this.stopScreenShare();
      throw error;
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.unsubscribeCall) {
      this.unsubscribeCall();
      this.unsubscribeCall = null;
    }
    if (this.unsubscribeAnswer) {
      this.unsubscribeAnswer();
      this.unsubscribeAnswer = null;
    }
  }
}

export const webRTCService = new WebRTCService();
