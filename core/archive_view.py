from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import Assignment

@login_required
def assignment_archive(request, assignment_id):
    """归档作业 - 仅限教师"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': '只支持POST请求'})
    
    if request.user.user_type != 'teacher':
        return JsonResponse({'success': False, 'message': '只有教师可以归档作业'})
    
    try:
        assignment = get_object_or_404(Assignment, id=assignment_id, created_by=request.user)
        
        # 检查是否已经归档
        if assignment.status == 'archived':
            return JsonResponse({'success': False, 'message': '作业已经归档'})
        
        # 更新作业状态为已归档
        assignment.status = 'archived'
        assignment.save()
        
        return JsonResponse({
            'success': True, 
            'message': '作业已成功归档'
        })
        
    except Assignment.DoesNotExist:
        return JsonResponse({'success': False, 'message': '作业不存在'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'归档失败：{str(e)}'})