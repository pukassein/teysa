import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Task, Worker, TaskComment } from '../../types';
import Card from '../ui/Card';
import TrashIcon from '../icons/TrashIcon';

interface TaskCommentsModalProps {
    task: Task;
    workers: Worker[];
    onClose: () => void;
    onDataChanged: () => void;
}

const TaskCommentsModal: React.FC<TaskCommentsModalProps> = ({ task, workers, onClose, onDataChanged }) => {
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchComments = async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error.message);
            setError('No se pudieron cargar los comentarios. Revisa los permisos de la tabla (RLS).');
        } else if (data) {
            setComments(data as TaskComment[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchComments();
    }, [task.id]);
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const { data, error } = await supabase.from('task_comments').insert({
            task_id: task.id,
            comment: newComment,
            author_id: null,
        }).select();
        
        setIsSubmitting(false);

        if (error) {
            console.error('Error adding comment:', error.message);
            alert(`No se pudo añadir el comentario. Error: ${error.message}`);
        } else if (data) {
            setNewComment('');
            // Optimistic UI update
            setComments(currentComments => [...currentComments, data[0] as TaskComment]);
            onDataChanged(); // Tell parent to re-fetch all comments to update counts
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            return;
        }

        const oldComments = [...comments];
        setComments(currentComments => currentComments.filter(c => c.id !== commentId));

        const { error } = await supabase
            .from('task_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error.message);
            alert(`No se pudo eliminar el comentario. Error: ${error.message}`);
            setComments(oldComments);
        } else {
            onDataChanged();
        }
    };
    
    const getAuthorName = (authorId: number | null) => {
        return 'Admin';
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-2xl"
                onClick={e => e.stopPropagation()}
            >
                <Card>
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Comentarios: {task.title}</h3>
                         <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="space-y-4 mb-4 max-h-[40vh] overflow-y-auto pr-2">
                        {loading && <p className="text-gray-500 text-center py-4">Cargando comentarios...</p>}
                        {error && <p className="text-red-600 font-semibold text-center py-4">{error}</p>}
                        {!loading && !error && comments.length === 0 && <p className="text-gray-500 text-center py-4">No hay comentarios aún.</p>}
                        {!loading && !error && comments.map(comment => (
                            <div key={comment.id} className="flex items-start space-x-3 group">
                               <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-3 flex-1 relative">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-gray-800 text-sm">{getAuthorName(comment.author_id)}</p>
                                        <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString('es-ES')}</p>
                                    </div>
                                    <p className="text-gray-700 mt-1">{comment.comment}</p>
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Eliminar comentario"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label htmlFor="newComment" className="block text-sm font-medium text-gray-700 sr-only">Nuevo Comentario</label>
                                <textarea
                                    id="newComment"
                                    rows={3}
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Escribe tu comentario aquí..."
                                    required
                                />
                            </div>
                            <div className="text-right">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Añadir Comentario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TaskCommentsModal;
