import React, { useRef, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { adminAPI } from '../services/api';
import { Image, Video, Music } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

// Custom image handler
const imageHandler = () => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminAPI.uploadFile(formData);
      const imageUrl = response.file.url;

      const quill = (window as any).quillInstance;
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', imageUrl);
        quill.setSelection(range.index + 1);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload image. Maximum file size is 20MB.';
      alert(errorMessage);
    }
  };
};

// Custom video handler
const videoHandler = () => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'video/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminAPI.uploadFile(formData);
      const videoUrl = response.file.url;

      const quill = (window as any).quillInstance;
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'video', videoUrl);
        quill.setSelection(range.index + 1);
      }
    } catch (error: any) {
      console.error('Error uploading video:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload video. Maximum file size is 20MB.';
      alert(errorMessage);
    }
  };
};

// Custom audio handler
const audioHandler = () => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'audio/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminAPI.uploadFile(formData);
      const audioUrl = response.file.url;

      const quill = (window as any).quillInstance;
      if (quill) {
        const range = quill.getSelection(true);
        // Insert audio as an iframe or custom HTML
        quill.insertEmbed(range.index, 'audio', audioUrl);
        quill.setSelection(range.index + 1);
      }
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload audio. Maximum file size is 20MB.';
      alert(errorMessage);
    }
  };
};

// Register audio format
const BlockEmbed = Quill.import('blots/block/embed');
class AudioBlot extends BlockEmbed {
  static create(value: string) {
    const node = super.create();
    node.setAttribute('src', value);
    node.setAttribute('controls', 'true');
    node.setAttribute('preload', 'metadata');
    return node;
  }
  
  static value(node: HTMLAudioElement) {
    return node.getAttribute('src');
  }
}
AudioBlot.blotName = 'audio';
AudioBlot.tagName = 'audio';
Quill.register(AudioBlot, true);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter question text...',
  height = '300px'
}) => {
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (quillRef.current) {
      (window as any).quillInstance = quillRef.current.getEditor();
    }
  }, []);

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video', 'audio'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        video: videoHandler,
        audio: audioHandler
      }
    },
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'color', 'background', 'align',
    'link', 'image', 'video', 'audio'
  ];

  return (
    <div className="rich-text-editor" style={{ height: height }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ height: `calc(${height} - 42px)`, marginBottom: '42px' }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          font-size: 16px;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor .ql-editor img,
        .rich-text-editor .ql-editor video {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor .ql-editor audio {
          width: 100%;
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
