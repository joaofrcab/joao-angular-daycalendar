import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})

export class CalendarComponent implements OnInit {

  @Input() events: any[] = [];
  calEvent: any = null;
  inputEventsArr: any[] = [];
  entriesArr: any[] = [];
  containerWidth: number = 600;
  collisions: number[] = [];
  clusters: Cluster[] = [];

  constructor() { }

  ngOnInit(): void { }

  /*
  * Required function.
  */
  layOutDay(events) {
    this.clean();
    this.initInputEventsArr(events);
    this.sortInputEventsArr();
    this.generateClusters();
    this.calculateClustersMaxCollisions();
    this.calculateEventsPosition();
  }

  /*
  * Cleans all data.
  */
  clean() {
    this.calEvent = null;
    this.inputEventsArr = [];
    this.entriesArr = [];
    this.containerWidth = 600;
    this.collisions = [];
    this.clusters = [];
  }

  /*
  * Initializes inputEventsArr array with either the value received from the input box (by parsing it)
  * or an input value such as [ {start: 30, end: 150}, {start: 540, end: 600}, {start: 560, end: 620}, {start: 610, end: 670} ]
  */
  initInputEventsArr(events) {
    if (typeof events == "string") {
      var jsonStr = events.replace(/(\w+:)|(\w+ :)/g, function (matchedStr) {
        return '"' + matchedStr.substring(0, matchedStr.length - 1) + '":';
      });
      var eventsFromString = JSON.parse(jsonStr);
      this.inputEventsArr = eventsFromString;
    } else {
      this.inputEventsArr = events;
    }
  }

  /*
  * Sorts inputEventsArr by start and end times.
  */
  sortInputEventsArr() {//transform to be generalized
    this.inputEventsArr.sort(function (a, b) {
      if (a["start"] > b["start"]) return 1;
      if (a["start"] < b["start"]) return -1;
      if (a["end"] > b["end"]) return 1;
      if (a["end"] < b["end"]) return -1;
      return 0;
    });
  }

  /*
  * Fills clusters array. A cluster is a group of events which are colliding.
  * Clusters are going to be used to calculate the widths of all events of a given cluster (which are equal).
  */
  generateClusters() {
    this.clusters.push(this.createClusterFromEvent(this.inputEventsArr[0]));
    for (var i = 1; i < this.inputEventsArr.length; i++) {
      var eventAdded: boolean = false;
      for (var j = 0; j < this.clusters.length && !eventAdded; j++) {
        if (this.isCollisionBetweenEventAndCluster(this.inputEventsArr[i], this.clusters[j])) {
          this.addEventToCluster(this.inputEventsArr[i], this.clusters[j]);
          eventAdded = true;
        }
      }
      if (!eventAdded) {
        this.clusters.push(this.createClusterFromEvent(this.inputEventsArr[i]));
      }
    }
  }

  /*
  * Creates a new cluster containing an event.
  */
  createClusterFromEvent(event): any {
    var newCluster: Cluster = {
      id: this.clusters.length,
      eventsArr: [],
      start: event["start"],
      end: event["end"],
      timesArr: [event["start"], event["end"]],
      collisions: 0,
    };
    newCluster.eventsArr.push(event);
    return newCluster;
  }

  /*
  * Adds an event to a given cluster.
  */
  addEventToCluster(event, cluster: Cluster) {
    cluster.eventsArr.push(event);
    cluster.start = Math.min(cluster.start, event["start"]);
    cluster.end = Math.max(cluster.end, event["end"]);
    cluster.timesArr.push(event["start"], event["end"])
  }

  /*
  * For all custers, calculates the max number of events overlapping.
  */
  calculateClustersMaxCollisions() {
    for (var i = 0; i < this.clusters.length; i++) {
      this.sortClusterTimes(this.clusters[i]);
      this.calculateMaxCollisionsOfCluster(this.clusters[i]);
    }
  }

  /*
  * Sorts the timesArr of a cluster.
  */
  sortClusterTimes(cluster: any) {
    cluster.timesArr.sort(function (a, b) {
      return a - b;
    });
  }

  /*
  * For each custer, calculates the max number of events overlapping for each point in time.
  * This value is used to find the width of all events in each cluster.
  */
  calculateMaxCollisionsOfCluster(cluster) {
    for (var j = 1; j < cluster.timesArr.length; j++) {
      var currentCollision: number = 0;
      for (var x = 0; x < cluster.eventsArr.length; x++) {
        if (this.isCollision(cluster.timesArr[j - 1], cluster.timesArr[j], cluster.eventsArr[x]["start"], cluster.eventsArr[x]["end"])) {
          currentCollision++;
        }
      }
      if (cluster.collisions < currentCollision) cluster.collisions = currentCollision;
    }
  }

  /*
  * Sets the properties of all events of each cluster.
  */
  calculateEventsPosition() {
    for (var i = 0; i < this.clusters.length; i++) {
      this.setClusterEventsProperties(this.clusters[i]);
    }
  }

  /*
  * Sets the properties of all events of a cluster.
  * Calculates the position of each event.
  * Adds events to a final list named entriesArr to be looped in the HTML.
  */
  setClusterEventsProperties(cluster) {
    var possibleColumns: number[] = [];
    for (var z = 0; z < cluster.collisions; z++) {
      possibleColumns.push(z);
    }

    var clusterEventsWidth = Math.floor(this.containerWidth / cluster.collisions);

    for (var i = 0; i < cluster.eventsArr.length; i++) {
      var possibleColumnsAux = possibleColumns;
      var calEvent = cluster.eventsArr[i];
      calEvent.top = calEvent.start;
      calEvent.height = calEvent.end - calEvent.start;
      calEvent.width = clusterEventsWidth;

      // Iterates over previously placed events
      for (var j = i - 1; j > -1; j--) {
        if (this.isCollisionBetweenEvents(cluster.eventsArr[i], cluster.eventsArr[j])) {
          possibleColumnsAux = possibleColumnsAux.filter(n => n != cluster.eventsArr[j].column);
        }
      }
      calEvent.column = possibleColumnsAux[0];
      calEvent.left = (calEvent.width * calEvent.column) + 10;

      calEvent.style = "top:" + calEvent.top + "px; left:" + calEvent.left + "px; width:" + calEvent.width + "px; height:" + calEvent.height + "px";
      this.entriesArr.push(cluster.eventsArr[i]);
    }
  }

  /*
  * Checks if an event overlaps a cluster.
  */
  isCollisionBetweenEventAndCluster(event, cluster: Cluster): boolean {
    return this.isCollision(event["start"], event["end"], cluster.start, cluster.end);
  }

  /*
  * Checks if two events are overlapping.
  */
  isCollisionBetweenEvents(event1, event2) {
    if (this.isCollision(event1["start"], event1["end"], event2["start"], event2["end"])) return true;
    return false;
  }

  /*
  * Checks if two blocks are overlapping by their start and end times.
  */
  isCollision(start1: number, end1: number, start2: number, end2: number): boolean {
    if ((start1 >= start2 && start1 < end2)
      || (start2 >= start1 && start2 < end1)) return true;
    return false;
  }

}
export interface Cluster {
  id: number;
  eventsArr: any[];
  start: number;
  end: number;
  timesArr: number[];
  collisions: number;
}
export interface Event {
  id: number;
  top: number;
  height: number;
  width: number;
  left: number;
  start: number;
  end: number;
}