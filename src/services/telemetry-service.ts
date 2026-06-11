
'use client';

import { Firestore, doc, collection, onSnapshot, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Service to handle WebRTC signaling for live screen monitoring.
 */
export const telemetryService = {
    /**
     * Initializes a signaling node for the specific target user.
     */
    async setupSignaling(db: Firestore, userId: string) {
        const signalRef = doc(db, `users/${userId}/telemetry`, 'session');
        await deleteDoc(signalRef); // Clear any old sessions
        return signalRef;
    },

    /**
     * Sends an ICE candidate to the peer.
     */
    async sendIceCandidate(db: Firestore, userId: string, type: 'caller' | 'callee', candidate: RTCIceCandidate) {
        const candidatesRef = collection(db, `users/${userId}/telemetry/session/${type}Candidates`);
        await setDoc(doc(candidatesRef), candidate.toJSON());
    },

    /**
     * Listens for ICE candidates from the peer.
     */
    onIceCandidate(db: Firestore, userId: string, type: 'caller' | 'callee', callback: (candidate: RTCIceCandidateInit) => void) {
        const candidatesRef = collection(db, `users/${userId}/telemetry/session/${type}Candidates`);
        return onSnapshot(candidatesRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    callback(change.doc.data() as RTCIceCandidateInit);
                }
            });
        });
    },

    /**
     * Sends an SDP offer or answer.
     */
    async sendSdp(db: Firestore, userId: string, sdp: RTCSessionDescriptionInit) {
        const signalRef = doc(db, `users/${userId}/telemetry`, 'session');
        await setDoc(signalRef, { [sdp.type]: { sdp: sdp.sdp, type: sdp.type } }, { merge: true });
    },

    /**
     * Listens for an SDP response.
     */
    onSdp(db: Firestore, userId: string, type: 'offer' | 'answer', callback: (sdp: RTCSessionDescriptionInit) => void) {
        const signalRef = doc(db, `users/${userId}/telemetry`, 'session');
        return onSnapshot(signalRef, (snapshot) => {
            const data = snapshot.data();
            if (data?.[type]) {
                callback(data[type]);
            }
        });
    }
};
