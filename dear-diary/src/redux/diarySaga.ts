import { put, take, takeEvery, takeLatest } from "redux-saga/effects";
import { addDiaryEntry, clearError, fetchCards, newCard, setDescription, setSubmitText } from "./diarySlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from '../config/firebase'
import { eventChannel } from "redux-saga";

interface DiaryEntry {
  title: string;
  username: string;
  description: string;
};

const cardsCollectionRef = collection(db, 'cards');

// Fetch diary entries and subscribe to real-time updates
function* fetchCardsSaga(): Generator<any, void, any> {
  try {
    
    // Channel to listen for real-time updates
    const channel = eventChannel((emit) => {
      const unsubscribe = onSnapshot(cardsCollectionRef, (querySnapshot) => {
        const updatedEntries: DiaryEntry[] = [];
        querySnapshot.forEach((doc) => {
          const entry = doc.data() as DiaryEntry;
          updatedEntries.push(entry);
        });
        // Emit the updated entries to the channel
        emit(updatedEntries);
      });

      return () => unsubscribe();
    });

    // Continuously listen for real-time updates and dispatch the addDiaryEntry action
    while (true) {
      const updatedEntries: DiaryEntry[] = yield take(channel);
      yield put(addDiaryEntry(updatedEntries));
    }

  } catch (error) {
    console.error('Error fetching diary entries: ', error);
  }
}

function* addNewCardSaga(action: PayloadAction<DiaryEntry>): Generator<any, void, any> {
  try {
    const { title, username, description } = action.payload;
    const newDiaryEntry: DiaryEntry = {
      title,
      username,
      description,
    };

    yield addDoc(cardsCollectionRef, newDiaryEntry);
    
    // Reset the form fields after successful submission
    yield put(clearError());
    yield put(setSubmitText(''));
    yield put(setDescription(''));
  } catch (error) {
    console.error('Error adding document: ', error);

  }
}

export default function* diarySaga() {
  yield takeEvery(fetchCards.type, fetchCardsSaga);
  yield takeLatest(newCard.type, addNewCardSaga)
}