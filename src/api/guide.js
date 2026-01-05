import { request } from '@/utils/request'

export function createTeamAPI(teamName) {
  return request({
    url: '/guide/team/create',
    method: 'POST',
    data: {
      team_name: teamName,
    },
  })
}
