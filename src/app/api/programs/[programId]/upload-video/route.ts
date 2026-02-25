import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

// Allow up to 60 seconds for video uploads
export const maxDuration = 60;

type Params = { params: Promise<{ programId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  // Verify programId exists (basic access check)
  const { programId } = await params;

  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!allowedTypes.includes(videoFile.type)) {
      return NextResponse.json({ error: 'Unsupported video format. Use MP4, WebM, or MOV.' }, { status: 400 });
    }

    // 100MB limit
    if (videoFile.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Video must be under 100MB' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify program exists
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const ext = videoFile.name.split('.').pop() || 'mp4';
    const fileName = `${programId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, {
        contentType: videoFile.type,
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
