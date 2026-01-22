import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert webm to a format Whisper accepts
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Upload to Supabase Storage
    const supabase = createServerClient();
    const fileName = `recordings/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/webm',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Continue without storing - transcription still works
    }

    // Get public URL if upload succeeded
    let audioUrl: string | undefined;
    if (uploadData) {
      const { data: urlData } = supabase.storage.from('audio').getPublicUrl(fileName);
      audioUrl = urlData.publicUrl;
    }

    // Transcribe with Whisper
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
    });

    return NextResponse.json({
      transcription: transcription.text,
      audioUrl,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
